import { Request, Response } from 'express';
import { classService } from './services/class.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';

/**
 * Create a new class
 * POST /api/v1/classes
 */
export const createClass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classRecord = await classService.create(req.body);

  res.status(201).json({
    success: true,
    data: classRecord,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get all classes with filters
 * GET /api/v1/classes
 */
export const getClasses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const filters = {
    centerId: req.query.centerId as string,
    status: req.query.status as any,
    academicLevel: req.query.academicLevel as any,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    sort: (req.query.sort as string) || 'createdAt',
    order: (req.query.order as any) || 'desc',
  };

  const result = await classService.getAll(filters);

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
 * Get class by ID
 * GET /api/v1/classes/:id
 */
export const getClassById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classRecord = await classService.getById(req.params.id);

  res.json({
    success: true,
    data: classRecord,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Update class
 * PUT /api/v1/classes/:id
 */
export const updateClass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classRecord = await classService.update(req.params.id, req.body);

  res.json({
    success: true,
    data: classRecord,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Archive class
 * DELETE /api/v1/classes/:id
 */
export const deleteClass = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const classRecord = await classService.archive(req.params.id);

  res.json({
    success: true,
    data: classRecord,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Assign teacher to class
 * POST /api/v1/classes/:id/teachers
 */
export const assignTeacher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { teacherId, role } = req.body;
  const result = await classService.assignTeacher(req.params.id, teacherId, role);

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Bulk assign teachers to class
 * POST /api/v1/classes/:id/teachers/bulk
 */
export const bulkAssignTeachers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { teachers } = req.body;
  const result = await classService.bulkAssignTeachers(req.params.id, teachers);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Remove teacher from class
 * DELETE /api/v1/classes/:id/teachers/:teacherId
 */
export const removeTeacher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { role } = req.query as any;
  await classService.removeTeacher(req.params.id, req.params.teacherId, role);

  res.json({
    success: true,
    data: { message: 'Teacher removed from class' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Enroll students in class
 * POST /api/v1/classes/:id/students
 */
export const enrollStudents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { studentIds, startDate, notes } = req.body;
  const result = await classService.enrollStudents(req.params.id, { studentIds, startDate, notes });

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Withdraw student from class
 * DELETE /api/v1/classes/:id/students/:studentId
 */
export const withdrawStudent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await classService.withdrawStudent(req.params.id, req.params.studentId);

  res.json({
    success: true,
    data: { message: 'Student withdrawn from class' },
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get class sessions
 * GET /api/v1/classes/:id/sessions
 */
export const getClassStudents = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const students = await classService.getEnrolledStudents(req.params.id);

  res.json({
    success: true,
    data: students,
    meta: { timestamp: new Date().toISOString(), count: students.length },
  });
});

export const generateClassSessions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { year, month } = req.body;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const result = await classService.generateSessionsForMonth(
      req.params.id,
      start,
      end
    );

    res.json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

export const getClassSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const filters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    status: req.query.status as string,
  };

  const sessions = await classService.getClassSessions(req.params.id, filters);

  res.json({
    success: true,
    data: sessions,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Validate class schedule
 * POST /api/v1/classes/:id/validate-schedule
 */
export const validateSchedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { schedule } = req.body;
  const result = await classService.validateSchedule(req.params.id, schedule);

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});