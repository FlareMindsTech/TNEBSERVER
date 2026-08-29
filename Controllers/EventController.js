import Event from '../Models/Event.js';
import { cloudinary } from '../config/Cloudinary.js';

// Helper to extract Cloudinary public ID from URL if needed
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      let afterUpload = parts[1];
      // Strip version number like v1234567890/
      afterUpload = afterUpload.replace(/^v\d+\//, '');
      return afterUpload;
    }
  } catch (err) {
    console.warn('[Cloudinary] Error parsing URL publicId:', err.message);
  }
  return null;
};

// Safe helper to destroy Cloudinary assets across all resource types without throwing uncaught errors
const safeDestroyCloudinary = async (publicIdOrUrl) => {
  if (!publicIdOrUrl) return;

  let publicId = publicIdOrUrl;
  if (typeof publicId === 'string' && (publicId.startsWith('http://') || publicId.startsWith('https://'))) {
    publicId = getPublicIdFromUrl(publicIdOrUrl) || publicId;
  }

  // 1. Try destroying as raw file (for PDF, docx, etc.)
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.warn(`[Cloudinary] Raw destroy failed for ${publicId}:`, err.message);
  }

  // 2. Try destroying as image
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn(`[Cloudinary] Image destroy failed for ${publicId}:`, err.message);
  }

  // 3. Try image destroy without file extension if extension was part of publicId
  if (typeof publicId === 'string' && publicId.includes('.')) {
    const withoutExt = publicId.substring(0, publicId.lastIndexOf('.'));
    if (withoutExt) {
      try {
        await cloudinary.uploader.destroy(withoutExt, { resource_type: 'image' });
      } catch (err) {
        // Silently continue
      }
    }
  }
};

// Enforces max 10 events rule: removes 11th and older events from DB & Cloudinary
const enforceMaxTenEvents = async (category) => {
  try {
    const filter = category ? { category } : {};
    const allEvents = await Event.find(filter).sort({ createdAt: -1, date: -1 });

    if (allEvents.length > 10) {
      const surplusEvents = allEvents.slice(10);

      for (const oldEvent of surplusEvents) {
        // Clean up file from Cloudinary
        const targetId = oldEvent.cloudinaryId || oldEvent.pdfUrl;
        if (targetId) {
          await safeDestroyCloudinary(targetId);
        }

        // Delete record from MongoDB
        try {
          await Event.findByIdAndDelete(oldEvent._id);
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
        await safeDestroyCloudinary(req.file.filename);
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

    // Automatically enforce max 10 limit (removes 11th+ oldest events from DB & Cloudinary)
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
      await safeDestroyCloudinary(req.file.filename);
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
        await safeDestroyCloudinary(req.file.filename);
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
        await safeDestroyCloudinary(oldFile);
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
      await safeDestroyCloudinary(req.file.filename);
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
      await safeDestroyCloudinary(targetFile);
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
