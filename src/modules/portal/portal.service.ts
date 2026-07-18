import { EnrollmentStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../../shared/types/error.types';
import { uploadHomeworkFile } from '../../shared/services/homework-upload.service';
import { paymentService } from '../payments/services/payment.service';

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

  async getSchedule(userId: string, monthStart: string) {
    const studentId = await this.resolveStudentId(userId);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(monthStart);
    if (!match) {
      return { monthStart, monthEnd: monthStart, sessions: [] };
    }

    const y = Number(match[1]);
    const m = Number(match[2]);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.active },
      select: { classId: true },
    });
    const classIds = enrollments.map((e) => e.classId);

    if (classIds.length === 0) {
      return {
        monthStart: start.toISOString().split('T')[0],
        monthEnd: end.toISOString().split('T')[0],
        sessions: [],
      };
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId: { in: classIds },
        sessionDate: { gte: start, lte: end },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
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

    return {
      monthStart: start.toISOString().split('T')[0],
      monthEnd: end.toISOString().split('T')[0],
      sessions: sessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate.toISOString().split('T')[0],
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
        sessionType: s.sessionType,
        notes: s.notes?.trim() || null,
        materials: s.materials.map((mat) => ({
          id: mat.id,
          fileUrl: mat.fileUrl,
          fileName: mat.fileName,
          fileType: mat.fileType,
          fileSize: mat.fileSize,
        })),
        hasHomework: Boolean(s.notes?.trim()) || s.materials.length > 0,
      })),
    };
  }

  async getInvoiceById(userId: string, invoiceId: string) {
    const studentId = await this.resolveStudentId(userId);

    const teacherBankSelect = {
      id: true,
      fullName: true,
      vietqrBankId: true,
      accountNo: true,
      accountName: true,
    } as const;

    const classTeacherInclude = {
      orderBy: { role: 'asc' as const },
      include: { teacher: { select: teacherBankSelect } },
    };

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, studentId },
      include: {
        student: { select: { id: true, fullName: true } },
        center: { select: { id: true, name: true, settings: true } },
        tuitionPlan: {
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                classTeachers: classTeacherInclude,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    const amountDue = Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0);
    const unpaid = ['issued', 'overdue'].includes(invoice.status) && amountDue > 0;

    let paymentQr: {
      qrCodeUrl: string;
      amount: number;
      receiverName: string;
      receiverBank: string;
      receiverAccount: string;
      description: string;
      teacherName: string | null;
      className: string | null;
    } | null = null;

    if (unpaid) {
      let className = invoice.tuitionPlan.class?.name ?? null;
      const classTeachers = invoice.tuitionPlan.class?.classTeachers ?? [];
      let teacherWithBank =
        classTeachers.find((ct) => ct.teacher.accountNo?.trim() && ct.teacher.vietqrBankId?.trim())
          ?.teacher ?? null;

      // Fallback: resolve via student's active class enrollments
      if (!teacherWithBank) {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId, status: EnrollmentStatus.active },
          select: {
            class: {
              select: {
                id: true,
                name: true,
                classTeachers: classTeacherInclude,
              },
            },
          },
        });

        for (const enr of enrollments) {
          const hit = enr.class.classTeachers.find(
            (ct) => ct.teacher.accountNo?.trim() && ct.teacher.vietqrBankId?.trim()
          )?.teacher;
          if (hit) {
            teacherWithBank = hit;
            className = enr.class.name;
            break;
          }
        }
      }

      // Last resort: any teacher in same center with bank who teaches this student
      if (!teacherWithBank) {
        const linked = await prisma.teacher.findFirst({
          where: {
            centerId: invoice.centerId,
            accountNo: { not: null },
            vietqrBankId: { not: null },
            classTeachers: {
              some: {
                class: {
                  enrollments: { some: { studentId, status: EnrollmentStatus.active } },
                },
              },
            },
          },
          select: teacherBankSelect,
        });
        if (linked?.accountNo?.trim() && linked.vietqrBankId?.trim()) {
          teacherWithBank = linked;
        }
      }

      const centerSettings =
        (invoice.center.settings as Record<string, string> | null) ?? {};

      const bankAccount =
        teacherWithBank?.accountNo?.trim() ||
        centerSettings.accountNo ||
        centerSettings.vietqrBankAccount ||
        '';
      const bankCode =
        teacherWithBank?.vietqrBankId?.trim() ||
        centerSettings.vietqrBankId ||
        centerSettings.vietqrBankCode ||
        '';
      const receiverName =
        teacherWithBank?.accountName?.trim() ||
        centerSettings.accountName ||
        centerSettings.vietqrAccountName ||
        teacherWithBank?.fullName ||
        invoice.center.name;

      if (bankAccount && bankCode) {
        const vietqr = await paymentService.generateVietQR({
          invoiceId: invoice.id,
          amount: amountDue,
          description: invoice.invoiceNumber,
          bankCode,
          bankAccount,
          receiverName,
        });

        paymentQr = {
          qrCodeUrl: vietqr.qrCodeUrl,
          amount: vietqr.amount,
          receiverName: vietqr.receiverName,
          receiverBank: vietqr.receiverBank,
          receiverAccount: vietqr.receiverAccount,
          description: vietqr.description,
          teacherName: teacherWithBank?.fullName ?? null,
          className,
        };
      }
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      amountDue,
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate,
      status: invoice.status,
      student: invoice.student,
      center: { id: invoice.center.id, name: invoice.center.name },
      paymentQr,
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
        homeworkSubmissions: {
          where: { studentId },
          select: {
            id: true,
            submittedAt: true,
            feedback: true,
            feedbackAt: true,
          },
          take: 1,
        },
      },
    });

    const items = sessions
      .filter((s) => {
        const hasNotes = Boolean(s.notes?.trim());
        return hasNotes || s.materials.length > 0;
      })
      .map((s) => {
        const own = s.homeworkSubmissions[0] ?? null;
        return {
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
          submitted: Boolean(own),
          hasFeedback: Boolean(own?.feedback?.trim()),
          submittedAt: own?.submittedAt ?? null,
          feedbackAt: own?.feedbackAt ?? null,
        };
      });

    return { items };
  }

  private sessionEndAt(sessionDate: Date, endTime: string): Date {
    // Session times are Vietnam local (UTC+7), independent of server timezone (Render = UTC).
    const dateStr = sessionDate.toISOString().split('T')[0];
    const [hh, mm] = endTime.split(':');
    const hour = String(Number(hh)).padStart(2, '0');
    const minute = String(Number(mm || 0)).padStart(2, '0');
    return new Date(`${dateStr}T${hour}:${minute}:00+07:00`);
  }

  private async assertStudentInSession(studentId: string, sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
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
    if (!session) throw new NotFoundException('Session');

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        classId: session.classId,
        status: EnrollmentStatus.active,
      },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this class');
    }

    return session;
  }

  async getSessionHomeworkDetail(userId: string, sessionId: string) {
    const studentId = await this.resolveStudentId(userId);
    const session = await this.assertStudentInSession(studentId, sessionId);
    const endAt = this.sessionEndAt(session.sessionDate, session.endTime);
    const canSubmit = Date.now() < endAt.getTime();

    const submission = await prisma.homeworkSubmission.findUnique({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
    });

    return {
      sessionId: session.id,
      classId: session.classId,
      className: session.class.name,
      sessionDate: session.sessionDate.toISOString().split('T')[0],
      startTime: session.startTime,
      endTime: session.endTime,
      classroom: session.classroom,
      notes: session.notes?.trim() || null,
      materials: session.materials,
      submissionDeadline: endAt.toISOString(),
      canSubmit,
      submission: submission
        ? {
            id: submission.id,
            fileUrl: submission.fileUrl,
            fileName: submission.fileName,
            fileType: submission.fileType,
            fileSize: submission.fileSize,
            note: submission.note,
            submittedAt: submission.submittedAt,
            feedback: submission.feedback,
            feedbackAt: submission.feedbackAt,
          }
        : null,
    };
  }

  async submitHomework(
    userId: string,
    sessionId: string,
    input: {
      note?: string;
      file?: { buffer: Buffer; originalname: string };
      baseUrl: string;
    }
  ) {
    const studentId = await this.resolveStudentId(userId);
    const session = await this.assertStudentInSession(studentId, sessionId);
    const endAt = this.sessionEndAt(session.sessionDate, session.endTime);

    if (Date.now() >= endAt.getTime()) {
      throw new BadRequestException(
        'Homework submission is locked after the class ends',
        'SUBMISSION_LOCKED'
      );
    }

    const note = input.note?.trim() || null;
    if (!note && !input.file) {
      throw new BadRequestException('Provide a note or a file', 'EMPTY_SUBMISSION');
    }

    let uploaded: {
      url: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      driveFileId: string;
    } | null = null;

    if (input.file) {
      uploaded = await uploadHomeworkFile(
        input.file.buffer,
        input.file.originalname,
        input.baseUrl,
        { kind: 'submission' }
      );
    }

    const existing = await prisma.homeworkSubmission.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });

    const data = {
      note: note ?? existing?.note ?? null,
      fileUrl: uploaded?.url ?? existing?.fileUrl ?? null,
      fileName: uploaded?.fileName ?? existing?.fileName ?? null,
      fileType: uploaded?.fileType ?? existing?.fileType ?? null,
      fileSize: uploaded?.fileSize ?? existing?.fileSize ?? null,
      driveFileId: uploaded?.driveFileId ?? existing?.driveFileId ?? null,
      submittedAt: new Date(),
    };

    if (!data.note && !data.fileUrl) {
      throw new BadRequestException('Provide a note or a file', 'EMPTY_SUBMISSION');
    }

    const submission = await prisma.homeworkSubmission.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      create: {
        sessionId,
        studentId,
        ...data,
      },
      update: data,
    });

    // Notify teacher that student submitted
    if (session.teacherId) {
      await prisma.notification.create({
        data: {
          userId: session.teacherId,
          type: 'homework_submission',
          title: 'Học sinh nộp bài tập',
          message: `Có bài nộp mới cho buổi ${session.class.name} (${session.sessionDate.toISOString().split('T')[0]} ${session.startTime}).`,
          data: {
            sessionId,
            studentId,
            submissionId: submission.id,
          },
        },
      });
    }

    return {
      id: submission.id,
      fileUrl: submission.fileUrl,
      fileName: submission.fileName,
      fileType: submission.fileType,
      fileSize: submission.fileSize,
      note: submission.note,
      submittedAt: submission.submittedAt,
      canSubmit: true,
    };
  }
}

export const portalService = new PortalService();
