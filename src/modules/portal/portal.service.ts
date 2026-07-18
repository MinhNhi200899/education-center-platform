import { EnrollmentStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundException } from '../../shared/types/error.types';

export class PortalService {
  private async resolveStudentId(userId: string): Promise<string> {
    const student = await prisma.student.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile');
    }
    return student.id;
  }

  async getDashboard(userId: string) {
    const studentId = await this.resolveStudentId(userId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        center: { select: { id: true, name: true, code: true } },
        enrollments: {
          where: { status: EnrollmentStatus.active },
          include: {
            class: {
              select: { id: true, name: true, classroom: true, schedule: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student');
    }

    const classIds = student.enrollments.map((e) => e.classId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingSessions =
      classIds.length === 0
        ? []
        : await prisma.session.findMany({
            where: {
              classId: { in: classIds },
              sessionDate: { gte: today },
              status: { in: ['scheduled', 'completed'] },
            },
            orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
            take: 8,
            include: {
              class: { select: { id: true, name: true } },
            },
          });

    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        studentId,
        status: { in: [InvoiceStatus.issued, InvoiceStatus.overdue] },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
        issueDate: true,
      },
    });

    const recentEvaluations = await prisma.evaluation.findMany({
      where: { studentId },
      orderBy: { evaluationDate: 'desc' },
      take: 5,
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    return {
      profile: {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        center: student.center,
      },
      classes: student.enrollments.map((e) => ({
        enrollmentId: e.id,
        classId: e.class.id,
        className: e.class.name,
        classroom: e.class.classroom,
        schedule: e.class.schedule,
        startDate: e.startDate,
      })),
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
      })),
      pendingInvoices: pendingInvoices.map((inv) => ({
        ...inv,
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        amountDue: Number(inv.totalAmount) - Number(inv.paidAmount ?? 0),
      })),
      recentEvaluations: recentEvaluations.map((ev) => ({
        id: ev.id,
        classId: ev.classId,
        className: ev.class?.name ?? null,
        evaluationDate: ev.evaluationDate,
        type: ev.evaluationType,
        participation: ev.participation,
        homework: ev.homework,
        behavior: ev.behavior,
        comments: ev.comments,
      })),
    };
  }

  async getSchedule(userId: string, weekStart: string) {
    const studentId = await this.resolveStudentId(userId);
    const start = new Date(`${weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.active },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    if (classIds.length === 0) {
      return { weekStart, sessions: [] };
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId: { in: classIds },
        sessionDate: { gte: start, lte: end },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    return {
      weekStart,
      sessions: sessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
        sessionType: s.sessionType,
      })),
    };
  }

  async getInvoiceById(userId: string, invoiceId: string) {
    const studentId = await this.resolveStudentId(userId);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, studentId },
      include: {
        student: { select: { id: true, fullName: true } },
        center: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      amountDue: Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0),
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate,
      status: invoice.status,
      student: invoice.student,
      center: invoice.center,
    };
  }

  async getInvoices(userId: string) {
    const studentId = await this.resolveStudentId(userId);

    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { issueDate: 'desc' },
      take: 50,
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        issueDate: true,
        status: true,
      },
    });

    return invoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      amountDue: Number(inv.totalAmount) - Number(inv.paidAmount ?? 0),
    }));
  }

  async getHomework(userId: string) {
    const studentId = await this.resolveStudentId(userId);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.active },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    if (classIds.length === 0) {
      return { items: [] };
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId: { in: classIds },
        OR: [
          { notes: { not: null } },
          { materials: { some: {} } },
        ],
      },
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'desc' }],
      take: 30,
      include: {
        class: { select: { id: true, name: true } },
        materials: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
            fileSize: true,
          },
        },
      },
    });

    const items = sessions
      .filter((s) => {
        const hasNotes = Boolean(s.notes?.trim());
        return hasNotes || s.materials.length > 0;
      })
      .map((s) => ({
        sessionId: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes?.trim() || null,
        materials: s.materials.map((m) => ({
          id: m.id,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileType: m.fileType,
          fileSize: m.fileSize,
        })),
      }));

    return { items };
  }
}

export const portalService = new PortalService();
