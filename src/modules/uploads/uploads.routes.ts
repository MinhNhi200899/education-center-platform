import { Router } from 'express';

import multer from 'multer';

import { authenticate } from '../auth/middleware/authenticate';

import { requirePermission, requireAnyPermission } from '../rbac/middleware/require-permission';

import { asyncHandler } from '../../shared/utils/async-handler';

import { uploadHomeworkFile } from '../../shared/services/homework-upload.service';
import {
  uploadAttendanceScreenshot,
  getLocalAttendanceScreenshotPath,
} from '../../shared/services/attendance-screenshot-upload.service';

import {

  getLocalHomeworkPath,

  isLocalHomeworkStorageId,

} from '../../shared/services/local-homework-storage.service';

import fs from 'fs';



const router = Router();

const upload = multer({

  storage: multer.memoryStorage(),

  limits: { fileSize: 50 * 1024 * 1024 },

});



router.get(

  '/homework/files/:storedName',

  authenticate,

  requireAnyPermission('sessions.read', 'sessions.update'),

  asyncHandler(async (req, res) => {

    const storedName = decodeURIComponent(req.params.storedName);

    const filePath = getLocalHomeworkPath(`local:${storedName}`);

    if (!filePath || !fs.existsSync(filePath)) {

      res.status(404).json({

        success: false,

        error: { message: 'File not found', code: 'NOT_FOUND' },

      });

      return;

    }



    res.sendFile(filePath);

  })

);



router.get(
  '/attendance-screenshot/files/:storedName',
  authenticate,
  requireAnyPermission('attendance.read', 'attendance.create', 'attendance.update'),
  asyncHandler(async (req, res) => {
    const storedName = decodeURIComponent(req.params.storedName);
    const filePath = getLocalAttendanceScreenshotPath(storedName);
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: { message: 'File not found', code: 'NOT_FOUND' },
      });
      return;
    }
    res.sendFile(filePath);
  })
);

router.post(
  '/attendance-screenshot',
  authenticate,
  requirePermission('attendance.create'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { message: 'No file uploaded', code: 'NO_FILE' },
      });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const uploaded = await uploadAttendanceScreenshot(
      req.file.buffer,
      req.file.originalname,
      baseUrl
    );

    res.status(201).json({
      success: true,
      data: uploaded,
      meta: { timestamp: new Date().toISOString() },
    });
  })
);

router.post(

  '/homework',

  authenticate,

  requirePermission('sessions.update'),

  upload.single('file'),

  asyncHandler(async (req, res) => {

    if (!req.file) {

      res.status(400).json({

        success: false,

        error: { message: 'No file uploaded', code: 'NO_FILE' },

      });

      return;

    }

    if (!req.file.buffer?.length) {
      res.status(400).json({
        success: false,
        error: { message: 'Uploaded file is empty', code: 'EMPTY_FILE' },
      });
      return;
    }



    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const uploaded = await uploadHomeworkFile(

      req.file.buffer,

      req.file.originalname,

      baseUrl

    );



    res.status(201).json({

      success: true,

      data: uploaded,

      meta: { timestamp: new Date().toISOString() },

    });

  })

);



export { isLocalHomeworkStorageId };



export default router;


