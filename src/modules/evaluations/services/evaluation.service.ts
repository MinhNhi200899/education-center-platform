import { Evaluation, EvaluationType, Prisma } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  ForbiddenException,
  NotFoundException,
  ValidationException,
} from '../../../shared/types/error.types';
import {
  BulkCreateEvaluationDTO,
  CreateEvaluationDTO,
  EvaluationFilters,
  EvaluationResponse,
  EvaluationScores,
  PaginatedEvaluations,
  UpdateEvaluationDTO,
} from '../types/evaluation.types';
import { renderEvaluationReport } from './evaluation-report.service';

const evaluationInclude = {
  student: { select: { id: true, fullName: true, centerId: true } },
  class: { select: { id: true, name: true, centerId: true } },
  teacher: { select: { id: true, fullName: true } },
} as const;

function buildScores(
  speakingScore?: number | null,
  writingScore?: number | null,
  scores?: EvaluationScores | null
): Prisma.InputJsonValue | undefined {
  const merged: EvaluationScores = { ...(scores || {}) };
  if (speakingScore != null) merged.speaking = speakingScore;
  if (writingScore != null) merged.writing = writingScore;
  if (Object.keys(merged).length === 0) return undefined;
  return merged as Prisma.InputJsonValue;
}

function parseScores(raw: unknown): EvaluationScores | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as EvaluationScores;
}

export function formatEvaluation(row: Evaluation & {
  student?: { id: string; fullName: string; centerId?: string };
  class?: { id: string; name: string; centerId?: string };
  teacher?: { id: string; fullName: string };
}): EvaluationResponse {
  const scores = parseScores(row.scores);
  return {
    id: row.id,
    studentId: row.studentId,
    classId: row.classId,
    teacherId: row.teacherId,
    evaluationType: row.evaluationType,
    evaluationDate: row.evaluationDate.toISOString().slice(0, 10),
    participation: row.participation,
    homework: row.homework,
    behavior: row.behavior,
    scores,
    speakingScore: scores?.speaking ?? null,
    writingScore: scores?.writing ?? null,
    comments: row.comments,
    student: row.student ? { id: row.student.id, fullName: row.student.fullName } : undefined,
    class: row.class ? { id: row.class.id, name: row.class.name } : undefined,
    teacher: row.teacher ? { id: row.teacher.id, fullName: row.teacher.fullName } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class EvaluationService {
  private buildWhere(filters: EvaluationFilters): Prisma.EvaluationWhereInput {
    const where: Prisma.EvaluationWhereInput = {};

    if (filters.centerId) {
      where.student = { centerId: filters.centerId };
    }
    if (filters.classId) where.classId = filters.classId;
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.evaluationType) where.evaluationType = filters.evaluationType;

    if (filters.month && filters.year) {
      const start = startOfMonth(new Date(filters.year, filters.month - 1, 1));
      const end = endOfMonth(start);
      where.evaluationDate = { gte: start, lte: end };
    } else if (filters.startDate || filters.endDate) {
      where.evaluationDate = {};
      if (filters.startDate) {
        (where.evaluationDate as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        (where.evaluationDate as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
      }
    }

    return where;
  }

  private async assertCenterAccess(evaluationId: string, centerId?: string): Promise<Evaluation> {
    const row = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { student: { select: { centerId: true } } },
    });
    if (!row) throw new NotFoundException('Evaluation');
    if (centerId && row.student.centerId !== centerId) {
      throw new ForbiddenException('Access denied to this evaluation');
    }
    return row;
  }

  private async resolveTeacherId(
    classId: string,
    userId?: string,
    explicitTeacherId?: string
  ): Promise<string> {
    if (explicitTeacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: explicitTeacherId } });
      if (!teacher) throw new NotFoundException('Teacher');
      return explicitTeacherId;
    }

    if (userId) {
      const linked = await prisma.teacher.findFirst({ where: { userId } });
      if (linked) return linked.id;
    }

    const primary = await prisma.classTeacher.findFirst({
      where: { classId, role: 'primary' },
      select: { teacherId: true },
    });
    if (primary) return primary.teacherId;

    const anyTeacher = await prisma.classTeacher.findFirst({
      where: { classId },
      select: { teacherId: true },
    });
    if (anyTeacher) return anyTeacher.teacherId;

    throw new ValidationException('teacherId is required when class has no assigned teacher');
  }

  private async validateStudentInClass(studentId: string, classId: string): Promise<void> {
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, classId, status: 'active' },
    });
    if (!enrollment) {
      throw new ValidationException('Student is not actively enrolled in this class');
    }
  }

  async list(filters: EvaluationFilters): Promise<PaginatedEvaluations> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(filters);

    const [rows, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ evaluationDate: 'desc' }, { createdAt: 'desc' }],
        include: evaluationInclude,
      }),
      prisma.evaluation.count({ where }),
    ]);

    return {
      data: rows.map(formatEvaluation),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async getById(id: string, centerId?: string): Promise<EvaluationResponse> {
    await this.assertCenterAccess(id, centerId);
    const row = await prisma.evaluation.findUnique({
      where: { id },
      include: evaluationInclude,
    });
    if (!row) throw new NotFoundException('Evaluation');
    return formatEvaluation(row);
  }

  async create(
    data: CreateEvaluationDTO,
    userId?: string,
    centerId?: string
  ): Promise<EvaluationResponse> {
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) throw new NotFoundException('Student');
    if (centerId && student.centerId !== centerId) {
      throw new ForbiddenException('Student does not belong to your center');
    }

    const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classRecord) throw new NotFoundException('Class');
    if (centerId && classRecord.centerId !== centerId) {
      throw new ForbiddenException('Class does not belong to your center');
    }

    await this.validateStudentInClass(data.studentId, data.classId);
    const teacherId = await this.resolveTeacherId(data.classId, userId, data.teacherId);

    const created = await prisma.evaluation.create({
      data: {
        studentId: data.studentId,
        classId: data.classId,
        teacherId,
        evaluationType: data.evaluationType,
        evaluationDate: new Date(data.evaluationDate),
        participation: data.participation ?? null,
        homework: data.homework ?? null,
        behavior: data.behavior ?? null,
        scores: buildScores(data.speakingScore, data.writingScore, data.scores),
        comments: data.comments ?? null,
      },
      include: evaluationInclude,
    });

    logger.info('Evaluation created', { evaluationId: created.id, classId: data.classId });
    return formatEvaluation(created);
  }

  async update(
    id: string,
    data: UpdateEvaluationDTO,
    centerId?: string
  ): Promise<EvaluationResponse> {
    const existing = await this.assertCenterAccess(id, centerId);
    const currentScores = parseScores(existing.scores);

    let speaking: number | undefined =
      data.speakingScore != null ? data.speakingScore : data.scores?.speaking;
    let writing: number | undefined =
      data.writingScore != null ? data.writingScore : data.scores?.writing;
    if (speaking === undefined) speaking = currentScores?.speaking;
    if (writing === undefined) writing = currentScores?.writing;

    const updated = await prisma.evaluation.update({
      where: { id },
      data: {
        ...(data.evaluationType && { evaluationType: data.evaluationType }),
        ...(data.evaluationDate && { evaluationDate: new Date(data.evaluationDate) }),
        ...(data.participation !== undefined && { participation: data.participation }),
        ...(data.homework !== undefined && { homework: data.homework }),
        ...(data.behavior !== undefined && { behavior: data.behavior }),
        ...(data.comments !== undefined && { comments: data.comments }),
        ...(data.teacherId && { teacherId: data.teacherId }),
        ...(data.speakingScore !== undefined ||
        data.writingScore !== undefined ||
        data.scores
          ? { scores: buildScores(speaking, writing, { ...currentScores, ...data.scores }) }
          : {}),
      },
      include: evaluationInclude,
    });

    return formatEvaluation(updated);
  }

  async delete(id: string, centerId?: string): Promise<void> {
    await this.assertCenterAccess(id, centerId);
    await prisma.evaluation.delete({ where: { id } });
    logger.info('Evaluation deleted', { evaluationId: id });
  }

  async bulkCreate(
    data: BulkCreateEvaluationDTO,
    userId?: string,
    centerId?: string
  ): Promise<{ created: number; evaluations: EvaluationResponse[] }> {
    const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
    if (!classRecord) throw new NotFoundException('Class');
    if (centerId && classRecord.centerId !== centerId) {
      throw new ForbiddenException('Class does not belong to your center');
    }

    const teacherId = await this.resolveTeacherId(data.classId, userId, data.teacherId);
    const evalDate = new Date(data.evaluationDate);

    const results: EvaluationResponse[] = [];

    await prisma.$transaction(async (tx) => {
      for (const record of data.records) {
        await this.validateStudentInClass(record.studentId, data.classId);

        const row = await tx.evaluation.create({
          data: {
            studentId: record.studentId,
            classId: data.classId,
            teacherId,
            evaluationType: data.evaluationType,
            evaluationDate: evalDate,
            participation: record.participation ?? null,
            homework: record.homework ?? null,
            behavior: record.behavior ?? null,
            scores: buildScores(record.speakingScore, record.writingScore),
            comments: record.comments ?? null,
          },
          include: evaluationInclude,
        });
        results.push(formatEvaluation(row));
      }
    });

    logger.info('Bulk evaluations created', {
      classId: data.classId,
      count: results.length,
    });

    return { created: results.length, evaluations: results };
  }

  async previewReport(id: string, centerId?: string) {
    const evaluation = await this.getById(id, centerId);
    const html = renderEvaluationReport(evaluation);
    return { evaluation, html, printable: true };
  }
}

export const evaluationService = new EvaluationService();
