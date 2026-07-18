import { Request, Response } from 'express';
import { studentService } from './services/student.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';
import { assertCenterAccess, resolveScopedCenterId } from '../../shared/utils/center-scope';

/**
 * Create a new student
 * POST /api/v1/students
 */
export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const centerId = resolveScopedCenterId(req, req.body.centerId);
  const student = await studentService.create({ ...req.body, centerId });

  res.status(201).json({
    success: true,
    data: student,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get all students with filters
 * GET /api/v1/students
 */
export const getStudents = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
    status: req.query.status as any,
    gender: req.query.gender as any,
    search: req.query.search as string,
    enrollmentDateFrom: req.query.enrollmentDateFrom as string,
    enrollmentDateTo: req.query.enrollmentDateTo as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    sort: (req.query.sort as string) || 'createdAt',
    order: (req.query.order as any) || 'desc',
  };

  const result = await studentService.getAll(filters);

  res.json({
    success: true,
    data: result.data,
    meta: {
      ...result.meta,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get student by ID
 * GET /api/v1/students/:id
 */
export const getStudentById = asyncHandler(async (req: Request, res: Response) => {
  const student = await studentService.getById(req.params.id);
  assertCenterAccess(req, student.centerId);

  res.json({
    success: true,
    data: student,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Update student
 * PUT /api/v1/students/:id
 */
export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const existing = await studentService.getById(req.params.id);
  assertCenterAccess(req, existing.centerId);
  const student = await studentService.update(req.params.id, req.body);

  res.json({
    success: true,
    data: student,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Archive student
 * DELETE /api/v1/students/:id
 */
export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const existing = await studentService.getById(req.params.id);
  assertCenterAccess(req, existing.centerId);
  const student = await studentService.archive(req.params.id);

  res.json({
    success: true,
    data: student,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Bulk archive students
 * POST /api/v1/students/bulk-delete
 */
export const bulkDeleteStudents = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body;
  for (const id of ids as string[]) {
    const existing = await studentService.getById(id);
    assertCenterAccess(req, existing.centerId);
  }
  const result = await studentService.bulkArchive(ids);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Add parent to student
 * POST /api/v1/students/:id/parents
 */
export const addParent = asyncHandler(async (req: Request, res: Response) => {
  const existing = await studentService.getById(req.params.id);
  assertCenterAccess(req, existing.centerId);
  await studentService.addParent(req.params.id, req.body);

  res.status(201).json({
    success: true,
    data: { message: 'Parent added successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Transfer student between classes
 * POST /api/v1/students/:id/transfer-class
 */
export const transferClass = asyncHandler(async (req: Request, res: Response) => {
  const existing = await studentService.getById(req.params.id);
  assertCenterAccess(req, existing.centerId);
  const { fromClassId, toClassId, effectiveDate, reason } = req.body;
  const result = await studentService.transferClass(req.params.id, {
    fromClassId,
    toClassId,
    effectiveDate,
    reason,
  });

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Import students from Excel
 * POST /api/v1/students/import
 */
export const importStudents = asyncHandler(async (req: Request, res: Response) => {
  const { rows } = req.body;

  if (!rows || !Array.isArray(rows)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Rows array is required',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const centerId = resolveScopedCenterId(req, req.body.centerId);
  const result = await studentService.importFromExcel(centerId!, rows);

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Export students to Excel
 * GET /api/v1/students/export
 */
export const exportStudents = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
    status: req.query.status as any,
    gender: req.query.gender as any,
    search: req.query.search as string,
    enrollmentDateFrom: req.query.enrollmentDateFrom as string,
    enrollmentDateTo: req.query.enrollmentDateTo as string,
  };

  const data = await studentService.exportToExcel(filters);

  res.json({
    success: true,
    data,
    meta: {
      count: data.length,
      timestamp: new Date().toISOString(),
    },
  });
});

export const studentsController = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  addParent,
  transferClass,
  importStudents,
  exportStudents,
};