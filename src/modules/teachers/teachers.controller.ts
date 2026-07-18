import { Request, Response } from 'express';
import { teacherService } from './services/teacher.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';
import { assertCenterAccess, resolveScopedCenterId } from '../../shared/utils/center-scope';

/**
 * Create teacher
 * POST /api/v1/teachers
 */
export const createTeacher = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const teacher = await teacherService.create({
      ...req.body,
      centerId: resolveScopedCenterId(req, req.body.centerId),
    });
    res.status(201).json({
      success: true,
      data: teacher,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get all teachers
 * GET /api/v1/teachers
 */
export const getTeachers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters = {
      centerId: resolveScopedCenterId(req, req.query.centerId as string | undefined),
      status: req.query.status as any,
      gender: req.query.gender as any,
      search: req.query.search as string,
      hireDateFrom: req.query.hireDateFrom as string,
      hireDateTo: req.query.hireDateTo as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: (req.query.sort as string) || 'createdAt',
      order: (req.query.order as any) || 'desc',
    };

    const result = await teacherService.getAll(filters);
    res.json({
      success: true,
      data: result.data,
      meta: { ...result.meta, timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get teacher by ID
 * GET /api/v1/teachers/:id
 */
export const getTeacherById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const teacher = await teacherService.getById(req.params.id);
    assertCenterAccess(req, teacher.centerId);
    res.json({
      success: true,
      data: teacher,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Update teacher
 * PUT /api/v1/teachers/:id
 */
export const updateTeacher = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const teacher = await teacherService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: teacher,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Archive teacher
 * DELETE /api/v1/teachers/:id
 */
export const deleteTeacher = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const teacher = await teacherService.archive(req.params.id);
    res.json({
      success: true,
      data: teacher,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Assign class to teacher
 * POST /api/v1/teachers/:id/classes
 */
export const assignClass = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    await teacherService.assignClass(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: { message: 'Class assigned successfully' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Bulk assign classes
 * POST /api/v1/teachers/:id/classes/bulk
 */
export const bulkAssignClasses = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const { classes } = req.body;
    await teacherService.bulkAssignClasses(req.params.id, classes);
    res.json({
      success: true,
      data: { message: 'Classes assigned' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Unassign class from teacher
 * DELETE /api/v1/teachers/:id/classes/:classId
 */
export const unassignClass = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    await teacherService.unassignClass(req.params.id, req.params.classId);
    res.json({
      success: true,
      data: { message: 'Class unassigned' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get teacher's class assignments
 * GET /api/v1/teachers/:id/assignments
 */
export const getClassAssignments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const assignments = await teacherService.getClassAssignments(req.params.id);
    res.json({
      success: true,
      data: assignments,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * Get teacher's teaching history
 * GET /api/v1/teachers/:id/history
 */
export const getTeachingHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const existing = await teacherService.getById(req.params.id);
    assertCenterAccess(req, existing.centerId);
    const history = await teacherService.getTeachingHistory(req.params.id);
    res.json({
      success: true,
      data: history,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);