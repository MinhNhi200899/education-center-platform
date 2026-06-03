import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
  classIdSchema,
  assignTeacherSchema,
  bulkAssignTeachersSchema,
  removeTeacherSchema,
  enrollStudentsSchema,
  withdrawStudentSchema,
} from './validators/class.validators';
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  assignTeacher,
  bulkAssignTeachers,
  removeTeacher,
  enrollStudents,
  withdrawStudent,
  getClassSessions,
  getClassStudents,
  generateClassSessions,
  validateSchedule,
} from './classes.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Class CRUD - requires classes.read permission
router.get(
  '/',
  requirePermission('classes.read'),
  validateRequest({ query: queryClassSchema }),
  getClasses
);

router.post(
  '/',
  requirePermission('classes.create'),
  validateRequest({ body: createClassSchema }),
  createClass
);

router.get(
  '/:id',
  requirePermission('classes.read'),
  validateRequest({ params: classIdSchema }),
  getClassById
);

router.put(
  '/:id',
  requirePermission('classes.update'),
  validateRequest({ params: classIdSchema, body: updateClassSchema }),
  updateClass
);

router.delete(
  '/:id',
  requirePermission('classes.delete'),
  validateRequest({ params: classIdSchema }),
  deleteClass
);

// Teacher assignment - requires classes.update
router.post(
  '/:id/teachers',
  requirePermission('classes.update'),
  validateRequest({ params: classIdSchema, body: assignTeacherSchema }),
  assignTeacher
);

router.post(
  '/:id/teachers/bulk',
  requirePermission('classes.update'),
  validateRequest({ params: classIdSchema, body: bulkAssignTeachersSchema }),
  bulkAssignTeachers
);

router.delete(
  '/:id/teachers/:teacherId',
  requirePermission('classes.update'),
  validateRequest({ params: removeTeacherSchema }),
  removeTeacher
);

// Student enrollment - requires classes.update
router.post(
  '/:id/students',
  requirePermission('classes.update'),
  validateRequest({ params: classIdSchema, body: enrollStudentsSchema }),
  enrollStudents
);

router.delete(
  '/:id/students/:studentId',
  requirePermission('classes.update'),
  validateRequest({ params: withdrawStudentSchema }),
  withdrawStudent
);

// Enrolled students
router.get(
  '/:id/students',
  requirePermission('classes.read'),
  validateRequest({ params: classIdSchema }),
  getClassStudents
);

// Class sessions - requires classes.read
router.get(
  '/:id/sessions',
  requirePermission('classes.read'),
  validateRequest({ params: classIdSchema }),
  getClassSessions
);

router.post(
  '/:id/sessions/generate',
  requirePermission('classes.update'),
  validateRequest({
    params: classIdSchema,
    body: z.object({
      year: z.coerce.number().int().min(2020).max(2100),
      month: z.coerce.number().int().min(1).max(12),
    }),
  }),
  generateClassSessions
);

// Validate schedule - requires classes.read
router.post(
  '/:id/validate-schedule',
  requirePermission('classes.read'),
  validateRequest({
    params: classIdSchema,
    body: z.object({ schedule: z.any() }),
  }),
  validateSchedule
);

export default router;