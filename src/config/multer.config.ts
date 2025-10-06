import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
    storage: diskStorage({
        destination: './public/avatars',
        filename: (req, file, cb) => {
            // Generate a unique filename with the original extension
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
            cb(null, uniqueName);
        },
    }),
    
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB, adjust as needed
    files: 50,
  },
};
