import Event from '../Models/Event.js';
import { cloudinary } from '../config/Cloudinary.js';
export const createEvent = async (req, res) => {
  try {
    const { title, description, date, category } = req.body;
    
    const newEvent = await Event.create({
      title,
      description,
      date,
      category,
      pdfUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    //Keep only the top 10 for the given category in the database
    const targetCategory = newEvent.category || 'new_event';
    const allEventsOfCategory = await Event.find({ category: targetCategory }).sort({ createdAt: -1 });

    if (allEventsOfCategory.length > 10) {
      const surplusEvents = allEventsOfCategory.slice(10); 

      for (let oldEvent of surplusEvents) {
        //Delete file from Cloudinary
        await cloudinary.uploader.destroy(oldEvent.cloudinaryId, { resource_type: 'raw' });
        //Delete record from DB
        await Event.findByIdAndDelete(oldEvent._id);
      }
    }

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET ALL (Latest 10) ---
export const getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    // Sort by newest first. Because of our create logic, 
    // there will never be more than 10 per category in the DB anyway.
    const events = await Event.find(filter).sort({ createdAt: -1 }); 
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE ---
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, category } = req.body;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (category !== undefined) updateData.category = category;

    if (req.file) {
      // Replace existing PDF in Cloudinary
      if (event.cloudinaryId) {
        await cloudinary.uploader.destroy(event.cloudinaryId, { resource_type: 'raw' });
      }
      updateData.pdfUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, { new: true });
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- DELETE (Corrected with Cloudinary Cleanup) ---
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // 1. Remove file from Cloudinary
    if (event.cloudinaryId) {
      await cloudinary.uploader.destroy(event.cloudinaryId, { resource_type: 'raw' });
    }

    // 2. Remove from MongoDB
    await Event.findByIdAndDelete(id);

    res.json({ message: "Event and associated PDF deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};