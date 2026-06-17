import About from '../Models/About.js';
import { cloudinary } from '../config/Cloudinary.js';

// Get About Page content
export const getAbout = async (req, res) => {
  try {
    const about = await About.findOne();
    if (!about) {
      return res.status(404).json({ message: 'About content not found' });
    }
    res.json(about);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create or Update About Page content
export const createOrUpdateAbout = async (req, res) => {
  try {
    const { title, content, vision, mission, history } = req.body;

    let about = await About.findOne();

    const updateData = {
      title,
      content,
      vision,
      mission,
      history,
      updatedAt: Date.now()
    };

    if (req.file) {
      if (about && about.cloudinaryId) {
        await cloudinary.uploader.destroy(about.cloudinaryId);
      }
      updateData.imageUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    if (about) {
      about = await About.findByIdAndUpdate(about._id, updateData, { new: true });
    } else {
      about = await About.create(updateData);
    }

    res.status(200).json(about);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
