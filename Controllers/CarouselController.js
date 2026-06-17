import Carousel from '../Models/Carousel.js';
import { cloudinary } from '../config/Cloudinary.js';

//create
export const createCarousel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Changed this to newCarousel
    const newCarousel = await Carousel.create({
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename,
      subtitle: req.body.subtitle
    });

    // Make sure this matches the variable name above
    res.status(201).json(newCarousel); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get
export const getCarousels = async (req, res) => {
  try {
    const carousels = await Carousel.find(); 
    res.json(carousels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// update
export const updateCarousel = async (req, res) => {
  try {
    const oldCarousel = await Carousel.findById(req.params.id);
    if (!oldCarousel) return res.status(404).json({ error: 'Carousel item not found' });

    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.subtitle !== undefined) updateData.subtitle = req.body.subtitle;

    if (req.file) {
      //Delete the old image from Cloudinary
      if (oldCarousel.cloudinaryId) {
        await cloudinary.uploader.destroy(oldCarousel.cloudinaryId);
      }
      updateData.imageUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    //Update with the new info
    const updatedCarousel = await Carousel.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true } 
    );

    res.json({
      message: "Update successfully",
      data: updatedCarousel
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// delete
export const deleteCarousel = async (req, res) => {
  try {
    const carousel = await Carousel.findById(req.params.id);
    if (!carousel) return res.status(404).json({ error: 'Not found' });

    await cloudinary.uploader.destroy(carousel.cloudinaryId);
    await Carousel.findByIdAndDelete(req.params.id);

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};