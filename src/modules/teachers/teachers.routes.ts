import { Router } from 'express';
import * as teachersController from './teachers.controller';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission } from '../rbac/middleware/require-permission';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  createTeacherSchema,
  updateTeacherSchema,
  queryTeacherSchema,
  teacherIdSchema,
  assignClassSchema,
  bulkAssignSchema,
} from './validators/teacher.validators';

const router = Router();

router.post(
  '/',
  authenticate,
  requirePermission('teachers.create'),
  validateRequest({ body: createTeacherSchema }),
  teachersController.createTeacher
);

router.get(
  '/',
  authenticate,
  requirePermission('teachers.read'),
  validateRequest({ query: queryTeacherSchema }),
  teachersController.getTeachers
);

router.get(
  '/:id',
  authenticate,
  requirePermission('teachers.read'),
  validateRequest({ params: teacherIdSchema }),
  teachersController.getTeacherById
);

router.put(
  '/:id',
  authenticate,
  requirePermission('teachers.update'),
  validateRequest({ params: teacherIdSchema, body: updateTeacherSchema }),
  teachersController.updateTeacher
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('teachers.delete'),
  validateRequest({ params: teacherIdSchema }),
  teachersController.deleteTeacher
);

router.post(
  '/:id/classes',
  authenticate,
  requirePermission('teachers.update'),
  validateRequest({ params: teacherIdSchema, body: assignClassSchema }),
  teachersController.assignClass
);

router.post(
  '/:id/classes/bulk',
  authenticate,
  requirePermission('teachers.update'),
  validateRequest({ params: teacherIdSchema, body: bulkAssignSchema }),
  teachersController.bulkAssignClasses
);

router.delete(
  '/:id/classes/:classId',
  authenticate,
  requirePermission('teachers.update'),
  validateRequest({ params: teacherIdSchema }),
  teachersController.unassignClass
);

router.get(
  '/:id/assignments',
  authenticate,
  requirePermission('teachers.read'),
  validateRequest({ params: teacherIdSchema }),
  teachersController.getClassAssignments
);

router.get(
  '/:id/history',
  authenticate,
  requirePermission('teachers.read'),
  validateRequest({ params: teacherIdSchema }),
  teachersController.getTeachingHistory
);

export default router;
