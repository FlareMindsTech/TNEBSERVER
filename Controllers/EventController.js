import Event from '../Models/Event.js';
import { deleteFromBunny } from '../config/Bunny.js';

// Safe helper to destroy assets without throwing uncaught errors
const safeDeleteFile = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;
  try {
    await deleteFromBunny(publicIdOrUrl);
  } catch (err) {
    console.warn(`[Bunny] Delete failed for ${publicIdOrUrl}:`, err.message);
  }
};

/**
 * Enforces maximum 10 events rule.
 * When more than 10 events exist, automatically deletes the oldest event(s) and their attached files from Cloudinary and DB.
 */
const enforceMaxTenEvents = async (category) => {
  try {
    const filter = category ? { category } : {};
    // Sort descending by createdAt and _id so index 0..9 are the newest, 10+ are the oldest
    const allEvents = await Event.find(filter).sort({ createdAt: -1, _id: -1 });

    if (allEvents.length > 10) {
      const surplusEvents = allEvents.slice(10); // The oldest events beyond top 10

      for (const oldEvent of surplusEvents) {
        console.log(`🗑️ Auto-deleting oldest surplus event: "${oldEvent.title}" (Created: ${oldEvent.createdAt})`);

        // 1. Delete the attached file from Cloudinary
        const targetId = oldEvent.cloudinaryId || oldEvent.pdfUrl;
        if (targetId) {
          await safeDeleteFile(targetId);
        }

        // 2. Delete the record from MongoDB
        try {
          await Event.findByIdAndDelete(oldEvent._id);
          console.log(`✅ Successfully deleted oldest event ID: ${oldEvent._id}`);
        } catch (dbErr) {
          console.error(`[DB] Error deleting surplus event ${oldEvent._id}:`, dbErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[EventController] Error enforcing event limit:', err.message);
  }
};

// --- CREATE EVENT ---
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, category } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      if (req.file?.filename) {
        await safeDeleteFile(req.file.filename);
      }
      return res.status(400).json({ message: 'Event title is required' });
    }

    const eventCategory = category ? category.trim() : 'new_event';

    const newEvent = await Event.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      date: date || new Date(),
      category: eventCategory,
      pdfUrl: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.filename : null
    });

    // Automatically enforce max 10 limit (deletes oldest events & files beyond 10)
    await enforceMaxTenEvents(eventCategory);
    await enforceMaxTenEvents(); // Also clean up overall collection if surplus exists

    // Format response
    const responseData = newEvent.toObject ? newEvent.toObject() : { ...newEvent };
    responseData.pdf = responseData.pdfUrl;

    res.status(201).json(responseData);
  } catch (err) {
    console.error('❌ Error creating event:', err);
    // Cleanup newly uploaded file on failure to prevent orphaned files in Cloudinary
    if (req.file?.filename) {
      await safeDeleteFile(req.file.filename);
    }
    res.status(500).json({ 
      message: err.message || 'Failed to create event', 
      error: err.message || err 
    });
  }
};

// --- GET ALL (Latest 10) ---
export const getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Auto-clean any surplus events older than 10
    await enforceMaxTenEvents(req.query.category);

    const events = await Event.find(filter).sort({ createdAt: -1, date: -1 });
    
    // Map with pdf alias for frontend compatibility
    const mappedEvents = events.map(evt => {
      const obj = evt.toObject ? evt.toObject() : { ...evt };
      obj.pdf = obj.pdfUrl;
      return obj;
    });

    res.json(mappedEvents);
  } catch (err) {
    console.error('❌ Error fetching events:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to fetch events', 
      error: err.message 
    });
  }
};

// --- UPDATE ---
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, category } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      if (req.file?.filename) {
        await safeDeleteFile(req.file.filename);
      }
      return res.status(404).json({ message: 'Event not found' });
    }

    let updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) updateData.category = category.trim();

    if (req.file) {
      // Replace existing file in Cloudinary safely
      const oldFile = event.cloudinaryId || event.pdfUrl;
      if (oldFile) {
        await safeDeleteFile(oldFile);
      }
      updateData.pdfUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true });
    const responseData = updatedEvent.toObject ? updatedEvent.toObject() : { ...updatedEvent };
    responseData.pdf = responseData.pdfUrl;

    res.json(responseData);
  } catch (err) {
    console.error('❌ Error updating event:', err);
    if (req.file?.filename) {
      await safeDeleteFile(req.file.filename);
    }
    res.status(500).json({ 
      message: err.message || 'Failed to update event', 
      error: err.message 
    });
  }
};

// --- DELETE ---
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // 1. Remove file from Cloudinary safely
    const targetFile = event.cloudinaryId || event.pdfUrl;
    if (targetFile) {
      await safeDeleteFile(targetFile);
    }

    // 2. Remove from MongoDB
    await Event.findByIdAndDelete(id);

    res.json({ message: 'Event and associated file deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting event:', err);
    res.status(500).json({ 
      message: err.message || 'Failed to delete event', 
      error: err.message 
    });
  }
};
