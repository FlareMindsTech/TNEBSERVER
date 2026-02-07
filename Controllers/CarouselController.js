import Carousel from '../Models/Carousel.js';
import { cloudinary } from '../Config/Cloudinary.js';

//create
export const createCarousel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Changed this to newCarousel
    const newCarousel = await Carousel.create({
      imageUrl: req.file.path,
      cloudinaryId: req.file.filename
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
    if (!req.file) return res.status(400).json({ error: "Please upload a new image to update" });

    const oldCarousel = await Carousel.findById(req.params.id);
    if (!oldCarousel) return res.status(404).json({ error: 'Carousel item not found' });

    //Delete the old image from Cloudinary
    await cloudinary.uploader.destroy(oldCarousel.cloudinaryId);

    //Update with the new image info
    const updatedCarousel = await Carousel.findByIdAndUpdate(
      req.params.id, 
      { 
        imageUrl: req.file.path, 
        cloudinaryId: req.file.filename 
      }, 
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