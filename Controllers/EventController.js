import Event from '../Models/Event.js';
import { cloudinary } from '../config/Cloudinary.js';
export const createEvent = async (req, res) => {
  try {
    const { title, description, date } = req.body;
    
    const newEvent = await Event.create({
      title,
      description,
      date,
      pdfUrl: req.file.path,
      cloudinaryId: req.file.filename
    });

    //Keep only the top 10 in the database
    const allEvents = await Event.find().sort({ createdAt: -1 });

    if (allEvents.length > 10) {
      const surplusEvents = allEvents.slice(10); 

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
    // Sort by newest first. Because of our create logic, 
    // there will never be more than 10 in the DB anyway.
    const events = await Event.find().sort({ createdAt: -1 }); 
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE ---
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date } = req.body;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    let updateData = { title, description, date };

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