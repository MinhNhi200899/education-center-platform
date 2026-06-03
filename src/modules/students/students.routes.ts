import { Router } from 'express';
import { studentsController } from './students.controller';
import { authenticate } from '../auth/middleware/authenticate';
import { requirePermission, requireAnyPermission } from '../rbac/middleware/require-permission';
import { requireStudentRead } from './middleware/require-student-read';
import { validateRequest } from '../../shared/middleware/validate-request';
import {
  createStudentSchema,
  updateStudentSchema,
  queryStudentSchema,
  studentIdSchema,
  bulkDeleteSchema,
  importSchema,
  parentSchema,
  transferClassBodySchema,
} from './validators/student.validators';

const router = Router();

/**
 * @route POST /api/v1/students
 * @description Create a new student
 * @access Authenticated (students.create)
 */
router.post(
  '/',
  authenticate,
  requirePermission('students.create'),
  validateRequest({ body: createStudentSchema }),
  studentsController.createStudent
);

/**
 * @route GET /api/v1/students
 * @description Get all students with filters
 * @access Authenticated (students.read)
 */
router.get(
  '/',
  authenticate,
  requirePermission('students.read'),
  validateRequest({ query: queryStudentSchema }),
  studentsController.getStudents
);

/**
 * @route GET /api/v1/students/export
 * @description Export students to Excel
 * @access Authenticated (students.export)
 */
router.get(
  '/export',
  authenticate,
  requirePermission('students.export'),
  validateRequest({ query: queryStudentSchema }),
  studentsController.exportStudents
);

/**
 * @route GET /api/v1/students/:id
 * @description Get student by ID
 * @access Authenticated (students.read)
 */
router.get(
  '/:id',
  authenticate,
  requireStudentRead,
  validateRequest({ params: studentIdSchema }),
  studentsController.getStudentById
);

/**
 * @route PUT /api/v1/students/:id
 * @description Update student
 * @access Authenticated (students.update)
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('students.update'),
  validateRequest({ params: studentIdSchema, body: updateStudentSchema }),
  studentsController.updateStudent
);

/**
 * @route DELETE /api/v1/students/:id
 * @description Archive student
 * @access Authenticated (students.delete)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('students.delete'),
  validateRequest({ params: studentIdSchema }),
  studentsController.deleteStudent
);

/**
 * @route POST /api/v1/students/bulk-delete
 * @description Bulk archive students
 * @access Authenticated (students.delete)
 */
router.post(
  '/bulk-delete',
  authenticate,
  requirePermission('students.delete'),
  validateRequest({ body: bulkDeleteSchema }),
  studentsController.bulkDeleteStudents
);

/**
 * @route POST /api/v1/students/:id/transfer-class
 * @description Smart transfer between classes (preserves enrollment history)
 * @access Authenticated (students.update)
 */
router.post(
  '/:id/transfer-class',
  authenticate,
  requirePermission('students.update'),
  validateRequest({ params: studentIdSchema, body: transferClassBodySchema }),
  studentsController.transferClass
);

/**
 * @route POST /api/v1/students/:id/parents
 * @description Add parent to student
 * @access Authenticated (students.update)
 */
router.post(
  '/:id/parents',
  authenticate,
  requirePermission('students.update'),
  validateRequest({ params: studentIdSchema, body: parentSchema }),
  studentsController.addParent
);

/**
 * @route POST /api/v1/students/import
 * @description Import students from Excel
 * @access Authenticated (students.create, students.export)
 */
router.post(
  '/import',
  authenticate,
  requireAnyPermission('students.create', 'students.export'),
  validateRequest({ body: importSchema }),
  studentsController.importStudents
);

export default router;