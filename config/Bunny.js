import multer from 'multer';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE_NAME || 'tneb-storage';
const ACCESS_KEY = process.env.BUNNY_STORAGE_API_KEY;
const STORAGE_HOST = process.env.BUNNY_STORAGE_HOSTNAME || 'storage.bunnycdn.com';
const CDN_URL = (process.env.BUNNY_CDN_URL || '').replace(/\/$/, '');

/**
 * MIME type map covering all image and document formats
 */
const MIME_TYPE_MAP = {
  // Images (All Formats)
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.svgz': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.raw': 'image/x-panasonic-raw',
  '.cr2': 'image/x-canon-cr2',
  '.nef': 'image/x-nikon-nef',
  '.psd': 'image/vnd.adobe.photoshop',
  '.ai': 'application/postscript',
  '.eps': 'application/postscript',
  
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv'
};

const getContentType = (filename, providedMime) => {
  if (providedMime && providedMime !== 'application/octet-stream') {
    return providedMime;
  }
  const ext = path.extname(filename || '').toLowerCase();
  return MIME_TYPE_MAP[ext] || 'application/octet-stream';
};

/**
 * Custom Multer Storage Engine for Bunny.net Storage (supports any image or file format)
 */
class BunnyStorageEngine {
  constructor(opts = {}) {
    this.folder = opts.folder || 'uploads';
  }

  _handleFile(req, file, cb) {
    const chunks = [];
    file.stream.on('data', (chunk) => chunks.push(chunk));
    file.stream.on('error', (err) => cb(err));
    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const ext = path.extname(file.originalname) || '';
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        const uniqueName = `${Date.now()}-${baseName}${ext}`;
        const folderPath = typeof this.folder === 'function' ? this.folder(req, file) : this.folder;
        const fileKey = folderPath ? `${folderPath}/${uniqueName}` : uniqueName;

        const contentType = getContentType(file.originalname, file.mimetype);
        const endpoint = `https://${STORAGE_HOST}/${STORAGE_ZONE}/${fileKey}`;

        await axios.put(endpoint, buffer, {
          headers: {
            AccessKey: ACCESS_KEY,
            'Content-Type': contentType,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        });

        const cdnUrl = `${CDN_URL}/${fileKey}`;

        cb(null, {
          path: cdnUrl,
          filename: fileKey,
          public_id: fileKey,
          url: cdnUrl,
          size: buffer.length,
          mimetype: contentType,
          originalname: file.originalname,
        });
      } catch (err) {
        console.error('❌ Bunny upload failed:', err.response?.data || err.message);
        cb(err);
      }
    });
  }

  _removeFile(req, file, cb) {
    if (file && (file.filename || file.path)) {
      deleteFromBunny(file.filename || file.path).finally(() => cb(null));
    } else {
      cb(null);
    }
  }
}

/**
 * Upload a file buffer directly to Bunny.net Storage
 * @param {Buffer} buffer
 * @param {string} originalname
 * @param {string} folder
 * @param {string} mimetype
 * @returns {Promise<{ url: string, path: string, filename: string, fileKey: string }>}
 */
export const uploadToBunny = async (buffer, originalname, folder = 'uploads', mimetype = 'application/octet-stream') => {
  const ext = path.extname(originalname) || '';
  const baseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueName = `${Date.now()}-${baseName}${ext}`;
  const fileKey = folder ? `${folder}/${uniqueName}` : uniqueName;

  const contentType = getContentType(originalname, mimetype);
  const endpoint = `https://${STORAGE_HOST}/${STORAGE_ZONE}/${fileKey}`;

  await axios.put(endpoint, buffer, {
    headers: {
      AccessKey: ACCESS_KEY,
      'Content-Type': contentType,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  const cdnUrl = `${CDN_URL}/${fileKey}`;

  return {
    url: cdnUrl,
    path: cdnUrl,
    filename: fileKey,
    fileKey: fileKey,
  };
};

/**
 * Delete a file from Bunny.net Storage
 * Accepts either a fileKey ('uploads/123-name.pdf') or a full CDN URL ('https://.../uploads/123-name.pdf')
 * @param {string} fileKeyOrUrl
 */
export const deleteFromBunny = async (fileKeyOrUrl) => {
  if (!fileKeyOrUrl || typeof fileKeyOrUrl !== 'string') return;

  let cleanKey = fileKeyOrUrl.trim();

  // If full URL provided, extract the path part
  if (cleanKey.startsWith('http://') || cleanKey.startsWith('https://')) {
    try {
      const parsed = new URL(cleanKey);
      cleanKey = parsed.pathname.replace(/^\//, '');
      if (cleanKey.startsWith(`${STORAGE_ZONE}/`)) {
        cleanKey = cleanKey.replace(`${STORAGE_ZONE}/`, '');
      }
    } catch {
      cleanKey = cleanKey.replace(CDN_URL, '').replace(/^\//, '');
    }
  }

  cleanKey = cleanKey.replace(/^\/+/, '');

  if (!cleanKey) return;

  const endpoint = `https://${STORAGE_HOST}/${STORAGE_ZONE}/${cleanKey}`;

  try {
    await axios.delete(endpoint, {
      headers: {
        AccessKey: ACCESS_KEY,
      },
    });
  } catch (error) {
    if (error.response?.status !== 404) {
      console.warn('⚠️ Warning: Failed to delete file from Bunny.net:', error.response?.data || error.message);
    }
  }
};

// Universal file filter: Accepts all formats (images, documents, etc.)
const universalFileFilter = (req, file, cb) => {
  cb(null, true);
};

// Multer Storage Engine Instances
export const bunnyStorage = new BunnyStorageEngine({ folder: 'uploads' });
export const bunnyCarouselStorage = new BunnyStorageEngine({ folder: 'carousels' });
export const bunnyGalleryStorage = new BunnyStorageEngine({ folder: 'gallery' });
export const bunnyDocumentsStorage = new BunnyStorageEngine({ folder: 'documents' });

// Multer Upload Middlewares
export const upload = multer({
  storage: bunnyStorage,
  fileFilter: universalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const uploadCarousel = multer({
  storage: bunnyCarouselStorage,
  fileFilter: universalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (accepts any image format)
});

export const uploadGallery = multer({
  storage: bunnyGalleryStorage,
  fileFilter: universalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const uploadDocument = multer({
  storage: bunnyDocumentsStorage,
  fileFilter: universalFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * Backward compatibility shim for Cloudinary API calls
 */
export const cloudinary = {
  uploader: {
    destroy: async (publicIdOrUrl) => {
      await deleteFromBunny(publicIdOrUrl);
      return { result: 'ok' };
    },
  },
  url: (publicId) => {
    if (!publicId) return '';
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
    return `${CDN_URL}/${publicId.replace(/^\//, '')}`;
  },
};

export default {
  upload,
  uploadCarousel,
  uploadGallery,
  uploadDocument,
  uploadToBunny,
  deleteFromBunny,
  cloudinary,
};
