import UserApplication from '../Models/UserApplication.js';
import { deleteFromBunny } from '../config/Bunny.js';

// Retrieve all applications for easy testing and admin viewing
export const getAllApplications = async (req, res) => {
  try {
    const applications = await UserApplication.find().sort({ createdAt: -1 });
    return res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching dynamic applications:', error);
    return res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Generic handler for submitting ANY form
export const submitApplication = async (req, res) => {
  try {
    // 1. Extract formType and initialize the bucket
    let { formType, formData, ...restBody } = req.body;
    let finalFormData = {};

    // 2. Handle both application/json AND multipart/form-data payloads dynamically
    if (typeof formData === 'string') {
        try { finalFormData = JSON.parse(formData); } catch(e) {}
    } else if (formData && typeof formData === 'object') {
        finalFormData = { ...formData };
    } else {
        finalFormData = { ...restBody };
    }

    // 3. Inject beautifully uploaded BunnyCDN image URLs directly into the JSON data!
    if (req.files && req.files.length > 0) {
       req.files.forEach(file => {
          // file.fieldname (e.g. 'photo' or 'signature') maps directly to the URL!
          finalFormData[file.fieldname] = file.url || file.path;
       });
    }

    const application = new UserApplication({
       formType: formType || 'UNKNOWN-FORM',
       formData: finalFormData
    });
    
    await application.save();
    return res.status(201).json({ message: `${formType} Application successfully saved!`, application });
    
  } catch (error) {
    console.error('Error saving dynamic application:', error);
    return res.status(500).json({ error: 'Failed to process application' });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const app = await UserApplication.findById(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    
    // Automatically sweep and destroy all uploaded images from BunnyCDN!
    if (app.formData) {
       for (const val of Object.values(app.formData)) {
          if (typeof val === 'string' && (val.includes('b-cdn.net') || val.includes('placeholder.com'))) {
              try {
                 await deleteFromBunny(val);
                 console.log(`Successfully destructed CDN asset: ${val}`);
              } catch(e) {
                 console.error(`Failed to destruct CDN asset ${val}:`, e.message);
              }
          }
       }
    }

    await UserApplication.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    return res.status(500).json({ error: 'Failed to delete application' });
  }
};

// Update Application Status (e.g., PENDING -> VERIFIED)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const app = await UserApplication.findById(id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    
    app.status = status;
    await app.save();
    
    return res.status(200).json({ message: `Application status updated to ${status}`, application: app });
  } catch (error) {
    console.error('Error updating application status:', error);
    return res.status(500).json({ error: 'Failed to update application status' });
  }
};
