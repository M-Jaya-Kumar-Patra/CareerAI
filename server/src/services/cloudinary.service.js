import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import { env } from '../config/env.js';

export function isCloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 503;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadResumeFile(file, { userId }) {
  configureCloudinary();
  const safeName = file.originalname.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_').slice(0, 80) || 'resume';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `${env.CLOUDINARY_RESUME_FOLDER}/${userId}`,
        public_id: `${Date.now()}-${safeName}`,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          const uploadError = new Error('Unable to upload resume file');
          uploadError.statusCode = 502;
          uploadError.code = 'CLOUDINARY_UPLOAD_FAILED';
          uploadError.cause = error;
          reject(uploadError);
          return;
        }
        resolve(result);
      },
    );
    Readable.from(file.buffer).pipe(stream);
  });
}

export async function deleteResumeFile(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return;
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
}

export function resumeFileUrl(publicId, { download = false } = {}) {
  configureCloudinary();
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    secure: true,
    sign_url: true,
    type: 'upload',
    flags: download ? 'attachment' : undefined,
    expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
  });
}
