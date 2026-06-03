import { Request, Response } from 'express';
import { attendanceService } from './services/attendance.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { logger } from '../../shared/services/logger.service';

/**
 * Get attendance records with filters
 * GET /api/v1/attendance
 */
export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    centerId: req.query.centerId as string,
    classId: req.query.classId as string,
    sessionId: req.query.sessionId as string,
    studentId: req.query.studentId as string,
    status: req.query.status as any,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    recordedBy: req.query.recordedBy as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };

  const result = await attendanceService.getAttendance(filters);

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
 * Mark single attendance record
 * POST /api/v1/attendance
 */
function getRecordedBy(req: Request): string {
  return req.user?.id || req.body.recordedBy || 'system';
}

export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const recordedBy = getRecordedBy(req);

  const record = await attendanceService.markAttendance(req.body, recordedBy);

  res.status(201).json({
    success: true,
    data: record,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Bulk mark attendance
 * POST /api/v1/attendance/bulk
 */
export const bulkMarkAttendance = asyncHandler(async (req: Request, res: Response) => {
  const recordedBy = getRecordedBy(req);

  const result = await attendanceService.bulkMarkAttendance(req.body, recordedBy);

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Mark attendance for all students in a session
 * POST /api/v1/attendance/session
 */
export const markSessionAttendance = asyncHandler(async (req: Request, res: Response) => {
  const recordedBy = getRecordedBy(req);

  const result = await attendanceService.markSessionAttendance(req.body, recordedBy);

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Update attendance record
 * PUT /api/v1/attendance/:id
 */
export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.updateAttendance(req.params.id, req.body);

  res.json({
    success: true,
    data: record,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Approve excused absence
 * POST /api/v1/attendance/:id/approve
 */
export const approveAbsence = asyncHandler(async (req: Request, res: Response) => {
  const record = await attendanceService.approveAbsence(req.params.id, req.body);

  res.json({
    success: true,
    data: record,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get student attendance history
 * GET /api/v1/attendance/student/:id
 */
export const getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };

  const result = await attendanceService.getStudentAttendance(req.params.id, filters);

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
 * Get class attendance
 * GET /api/v1/attendance/class/:id
 */
export const getClassAttendance = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    sessionId: req.query.sessionId as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };

  const result = await attendanceService.getClassAttendance(req.params.id, filters);

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
 * Get attendance statistics
 * GET /api/v1/attendance/stats
 */
export const getAttendanceStats = asyncHandler(async (req: Request, res: Response) => {
  const { studentId, classId, sessionId, startDate, endDate } = req.query;

  let stats;

  if (studentId) {
    stats = await attendanceService.getStudentStats(
      studentId as string,
      startDate as string,
      endDate as string
    );
  } else if (classId) {
    stats = await attendanceService.getClassStats(
      classId as string,
      sessionId as string,
      startDate as string,
      endDate as string
    );
  } else {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Either studentId or classId is required for statistics',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  res.json({
    success: true,
    data: stats,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Get session with students for attendance marking
 * GET /api/v1/attendance/session/:id
 */
export const getSessionAttendance = asyncHandler(async (req: Request, res: Response) => {
  const students = await attendanceService.getSessionWithEnrollments(req.params.id);

  res.json({
    success: true,
    data: students,
    meta: {
      count: students.length,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Get absence reasons
 * GET /api/v1/attendance/reasons
 */
export const getAbsenceReasons = asyncHandler(async (req: Request, res: Response) => {
  const centerId = req.query.centerId as string;

  const reasons = await attendanceService.getAbsenceReasons(centerId);

  res.json({
    success: true,
    data: reasons,
    meta: {
      count: reasons.length,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Create absence reason
 * POST /api/v1/attendance/reasons
 */
export const createAbsenceReason = asyncHandler(async (req: Request, res: Response) => {
  const centerId = req.body.centerId || req.headers['x-center-id'] as string;

  if (!centerId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Center ID is required',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const reason = await attendanceService.createAbsenceReason(centerId, req.body);

  res.status(201).json({
    success: true,
    data: reason,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Update absence reason
 * PUT /api/v1/attendance/reasons/:id
 */
export const updateAbsenceReason = asyncHandler(async (req: Request, res: Response) => {
  const reason = await attendanceService.updateAbsenceReason(req.params.id, req.body);

  res.json({
    success: true,
    data: reason,
    meta: { timestamp: new Date().toISOString() },
  });
});

/**
 * Delete absence reason
 * DELETE /api/v1/attendance/reasons/:id
 */
export const deleteAbsenceReason = asyncHandler(async (req: Request, res: Response) => {
  await attendanceService.deleteAbsenceReason(req.params.id);

  res.json({
    success: true,
    data: { message: 'Absence reason deleted successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
});

export const getMonthlyGrid = asyncHandler(async (req: Request, res: Response) => {
  const { classId, year, month } = req.query as {
    classId: string;
    year: string;
    month: string;
  };

  const grid = await attendanceService.getMonthlyGrid(
    classId,
    parseInt(year, 10),
    parseInt(month, 10)
  );

  res.json({
    success: true,
    data: grid,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const prepareMonthlySessions = asyncHandler(async (req: Request, res: Response) => {
  const { classId, year, month } = req.body;

  const result = await attendanceService.prepareMonthlySessions(
    classId,
    year,
    month
  );

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const bulkMonthlyMark = asyncHandler(async (req: Request, res: Response) => {
  const recordedBy = getRecordedBy(req);
  const result = await attendanceService.bulkMonthlyMark(req.body, recordedBy);

  res.status(201).json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});

export const syncOfflineAttendance = asyncHandler(async (req: Request, res: Response) => {
  const recordedBy = getRecordedBy(req);
  const result = await attendanceService.syncOfflineRecords(
    req.body.records,
    recordedBy
  );

  res.json({
    success: true,
    data: result,
    meta: { timestamp: new Date().toISOString() },
  });
});