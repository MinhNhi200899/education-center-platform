import { prisma } from '../../config/database';
import { paymentService } from '../payments/services/payment.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../shared/types/error.types';

export class TeacherPortalService {
  private currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private parseMonthPeriod(month: string): { periodStart: Date; periodEnd: Date } {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    return {
      periodStart: new Date(Date.UTC(y, m - 1, 1)),
      periodEnd: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  }

  private assertFeeMonthEditable(month: string): void {
    if (month < this.currentMonthKey()) {
      throw new ConflictException(
        'Cannot set tuition fee for a past month.',
        'FEE_MONTH_LOCKED'
      );
    }
  }

  private async assertStudentFeeEditable(
    classId: string,
    studentId: string,
    month: string
  ): Promise<void> {
    this.assertFeeMonthEditable(month);
    const { periodStart, periodEnd } = this.parseMonthPeriod(month);
    const invoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        tuitionPlan: { classId },
        issueDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['paid', 'issued'] },
      },
      select: { id: true },
    });
    if (invoice) {
      throw new ConflictException(
        'Tuition fee is locked after a receipt was issued or paid.',
        'FEE_INVOICE_LOCKED'
      );
    }
  }

  private isStudentFeeEditable(
    month: string,
    invoiceStatus: string | null | undefined
  ): boolean {
    if (month < this.currentMonthKey()) return false;
    if (invoiceStatus === 'paid' || invoiceStatus === 'issued') return false;
    return true;
  }

  private isCollectAmountEditable(
    month: string,
    invoiceStatus: string | null | undefined
  ): boolean {
    if (month < this.currentMonthKey()) return false;
    if (invoiceStatus === 'paid') return false;
    return true;
  }

  private resolveTuitionToCollect(
    monthlyFeeAmount: number,
    sessionsAttended: number,
    collectAmount: number | null | undefined
  ): number {
    if (collectAmount != null) {
      return Math.round(collectAmount);
    }
    return Math.round(monthlyFeeAmount * sessionsAttended);
  }

  private async assertCollectAmountEditable(
    classId: string,
    studentId: string,
    month: string
  ): Promise<void> {
    this.assertFeeMonthEditable(month);
    const { periodStart, periodEnd } = this.parseMonthPeriod(month);
    const paidInvoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        tuitionPlan: { classId },
        issueDate: { gte: periodStart, lte: periodEnd },
        status: 'paid',
      },
      select: { id: true },
    });
    if (paidInvoice) {
      throw new ConflictException(
        'Cannot change collect amount after payment.',
        'COLLECT_AMOUNT_LOCKED'
      );
    }
  }

  private async syncOpenInvoiceAmount(
    classId: string,
    studentId: string,
    month: string,
    amount: number,
    sessionsAttended: number,
    className: string
  ): Promise<void> {
    const { periodStart, periodEnd } = this.parseMonthPeriod(month);
    const invoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        tuitionPlan: { classId },
        issueDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['draft', 'issued', 'overdue'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!invoice || Number(invoice.totalAmount) === amount) {
      return;
    }
    await this.syncDraftInvoiceAmount(
      invoice.id,
      amount,
      sessionsAttended,
      className,
      month
    );
  }
  private async resolveTeacherId(userId: string): Promise<string> {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile');
    }
    return teacher.id;
  }

  private async getClassIds(teacherId: string): Promise<string[]> {
    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId },
      select: { classId: true },
    });
    return assignments.map((a) => a.classId);
  }

  async getDashboard(userId: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        center: { select: { id: true, name: true, code: true } },
        classTeachers: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                classroom: true,
                schedule: true,
                status: true,
                _count: { select: { enrollments: true } },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher');
    }

    const classIds = teacher.classTeachers.map((ct) => ct.classId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

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

    const todaySessions =
      classIds.length === 0
        ? []
        : await prisma.session.findMany({
            where: {
              classId: { in: classIds },
              sessionDate: { gte: today, lte: endOfToday },
            },
            orderBy: { startTime: 'asc' },
            include: {
              class: { select: { id: true, name: true } },
            },
          });

    // ---- Students with session counts + revenue summary ----
    let students: Array<{
      studentId: string;
      fullName: string;
      avatarUrl: string | null;
      classNames: string[];
      sessionsAttended: number;
      attendanceRate: number;
    }> = [];
    let revenue = {
      totalRevenue: 0,
      paidInvoiceCount: 0,
      unpaidAmount: 0,
      unpaidStudentCount: 0,
      studentCount: 0,
    };

    if (classIds.length > 0) {
      const enrollments = await prisma.enrollment.findMany({
        where: { classId: { in: classIds }, status: 'active' },
        select: {
          studentId: true,
          classId: true,
          student: { select: { id: true, fullName: true, avatarUrl: true } },
          class: { select: { name: true } },
        },
      });

      // Dedupe students, accumulate class names
      const studentMap = new Map<
        string,
        { studentId: string; fullName: string; avatarUrl: string | null; classNames: string[] }
      >();
      for (const e of enrollments) {
        const existing = studentMap.get(e.studentId);
        if (existing) {
          if (!existing.classNames.includes(e.class.name)) {
            existing.classNames.push(e.class.name);
          }
        } else {
          studentMap.set(e.studentId, {
            studentId: e.student.id,
            fullName: e.student.fullName,
            avatarUrl: e.student.avatarUrl,
            classNames: [e.class.name],
          });
        }
      }

      const studentIds = [...studentMap.keys()];
      const totalSessionsInClasses = await prisma.session.count({
        where: { classId: { in: classIds } },
      });

      if (studentIds.length > 0) {
        const attendanceCounts = await prisma.attendanceRecord.groupBy({
          by: ['studentId'],
          where: {
            studentId: { in: studentIds },
            session: { classId: { in: classIds } },
            status: 'present',
          },
          _count: { _all: true },
        });
        const countMap = new Map(attendanceCounts.map((a) => [a.studentId, a._count._all]));

        students = [...studentMap.values()]
          .map((s) => {
            const sessionsAttended = countMap.get(s.studentId) ?? 0;
            const attendanceRate =
              totalSessionsInClasses > 0
                ? Math.round((sessionsAttended / totalSessionsInClasses) * 100)
                : 0;
            return { ...s, sessionsAttended, attendanceRate };
          })
          .sort((a, b) => b.sessionsAttended - a.sessionsAttended)
          .slice(0, 20);

        // Revenue: paid invoices + công nợ = học phí phải đóng (tháng hiện tại) − đã thu
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const periodStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const periodEnd = new Date(
          Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        );

        const enrollmentKeys = enrollments.map((e) => ({
          classId: e.classId,
          studentId: e.studentId,
        }));

        const [paidAgg, monthlyFees, attendanceRecords, paidInvoicesThisMonth] =
          await Promise.all([
            prisma.invoice.aggregate({
              where: { studentId: { in: studentIds }, status: 'paid' },
              _sum: { totalAmount: true },
              _count: { _all: true },
            }),
            prisma.classStudentMonthlyFee.findMany({
              where: {
                classId: { in: classIds },
                month: currentMonth,
                studentId: { in: studentIds },
              },
              select: { classId: true, studentId: true, amount: true },
            }),
            prisma.attendanceRecord.findMany({
              where: {
                studentId: { in: studentIds },
                status: { in: ['present', 'late'] },
                session: {
                  classId: { in: classIds },
                  sessionDate: { gte: periodStart, lte: periodEnd },
                },
              },
              select: { studentId: true, session: { select: { classId: true } } },
            }),
            prisma.invoice.findMany({
              where: {
                studentId: { in: studentIds },
                status: 'paid',
                issueDate: { gte: periodStart, lte: periodEnd },
                tuitionPlan: { classId: { in: classIds } },
              },
              select: {
                studentId: true,
                totalAmount: true,
                tuitionPlan: { select: { classId: true } },
              },
            }),
          ]);

        const feeByKey = new Map(
          monthlyFees.map((f) => [`${f.classId}:${f.studentId}`, Number(f.amount)])
        );
        const attendedByKey = new Map<string, number>();
        for (const record of attendanceRecords) {
          const key = `${record.session.classId}:${record.studentId}`;
          attendedByKey.set(key, (attendedByKey.get(key) ?? 0) + 1);
        }
        const paidByKey = new Map<string, number>();
        for (const inv of paidInvoicesThisMonth) {
          const classId = inv.tuitionPlan.classId;
          if (!classId) continue;
          const key = `${classId}:${inv.studentId}`;
          paidByKey.set(key, (paidByKey.get(key) ?? 0) + Number(inv.totalAmount));
        }

        let unpaidAmount = 0;
        const studentsWithDebt = new Set<string>();
        for (const { classId, studentId } of enrollmentKeys) {
          const monthlyFee = feeByKey.get(`${classId}:${studentId}`);
          if (monthlyFee == null) continue;

          const expected = Math.round(monthlyFee * (attendedByKey.get(`${classId}:${studentId}`) ?? 0));
          if (expected <= 0) continue;

          const owed = Math.max(0, expected - (paidByKey.get(`${classId}:${studentId}`) ?? 0));
          if (owed > 0) {
            unpaidAmount += owed;
            studentsWithDebt.add(studentId);
          }
        }

        revenue = {
          totalRevenue: Number(paidAgg._sum.totalAmount ?? 0),
          paidInvoiceCount: paidAgg._count._all,
          unpaidAmount,
          unpaidStudentCount: studentsWithDebt.size,
          studentCount: studentIds.length,
        };
      }
    }

    return {
      profile: {
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        phone: teacher.phone,
        center: teacher.center,
      },
      classes: teacher.classTeachers.map((ct) => ({
        classId: ct.class.id,
        className: ct.class.name,
        classroom: ct.class.classroom,
        schedule: ct.class.schedule,
        status: ct.class.status,
        studentCount: ct.class._count.enrollments,
        role: ct.role,
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
      todaySessions: todaySessions.map((s) => ({
        id: s.id,
        classId: s.classId,
        className: s.class.name,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        classroom: s.classroom,
        status: s.status,
      })),
      students,
      revenue,
    };
  }

  async getSchedule(userId: string, monthStart: string) {
    const teacherId = await this.resolveTeacherId(userId);
    const classIds = await this.getClassIds(teacherId);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(monthStart);
    if (!match) {
      return { monthStart, monthEnd: monthStart, sessions: [] };
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));

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
        _count: { select: { attendanceRecords: true } },
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
        attendanceMarked: s._count.attendanceRecords > 0,
      })),
    };
  }

  async getClasses(userId: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignments = await prisma.classTeacher.findMany({
      where: { teacherId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            classroom: true,
            schedule: true,
            status: true,
            academicLevel: true,
            startDate: true,
            endDate: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((ct) => ({
      classId: ct.class.id,
      className: ct.class.name,
      classroom: ct.class.classroom,
      schedule: ct.class.schedule,
      status: ct.class.status,
      academicLevel: ct.class.academicLevel,
      startDate: ct.class.startDate,
      endDate: ct.class.endDate,
      studentCount: ct.class._count.enrollments,
      role: ct.role,
    }));
  }

  async getClassStudents(userId: string, classId: string, month: string) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }

    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }

    const y = Number(match[1]);
    const m = Number(match[2]);
    const periodStart = new Date(Date.UTC(y, m - 1, 1));
    const periodEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    const monthEditable = month >= this.currentMonthKey();

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true },
    });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'active' },
      include: {
        student: {
          select: { id: true, fullName: true, avatarUrl: true, phone: true },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const studentIds = enrollments.map((e) => e.studentId);

    const [sessionCountInMonth, attendanceCounts, monthlyFees, invoices] = await Promise.all([
      prisma.session.count({
        where: {
          classId,
          sessionDate: { gte: periodStart, lte: periodEnd },
          status: { in: ['scheduled', 'completed'] },
        },
      }),
      studentIds.length === 0
        ? Promise.resolve([])
        : prisma.attendanceRecord.groupBy({
            by: ['studentId'],
            where: {
              studentId: { in: studentIds },
              status: { in: ['present', 'late'] },
              session: {
                classId,
                sessionDate: { gte: periodStart, lte: periodEnd },
              },
            },
            _count: { _all: true },
          }),
      studentIds.length === 0
        ? Promise.resolve([])
        : prisma.classStudentMonthlyFee.findMany({
            where: { classId, month, studentId: { in: studentIds } },
            select: { studentId: true, amount: true, collectAmount: true, note: true },
          }),
      studentIds.length === 0
        ? Promise.resolve([])
        : prisma.invoice.findMany({
            where: {
              studentId: { in: studentIds },
              tuitionPlan: { classId },
              issueDate: { gte: periodStart, lte: periodEnd },
            },
            select: {
              id: true,
              studentId: true,
              totalAmount: true,
              status: true,
              invoiceNumber: true,
            },
          }),
    ]);

    const attendanceByStudent = new Map(
      attendanceCounts.map((row) => [row.studentId, row._count._all])
    );
    const feeByStudent = new Map(monthlyFees.map((fee) => [fee.studentId, fee]));
    const invoiceByStudent = new Map(invoices.map((inv) => [inv.studentId, inv]));

    const students = enrollments.map((e) => {
      const invoice = invoiceByStudent.get(e.studentId);
      const monthlyFee = feeByStudent.get(e.studentId);
      const sessionsAttended = attendanceByStudent.get(e.studentId) ?? 0;
      const monthlyFeeAmount = monthlyFee ? Number(monthlyFee.amount) : null;
      const collectAmount =
        monthlyFee?.collectAmount != null ? Number(monthlyFee.collectAmount) : null;
      const baseTuition =
        monthlyFeeAmount != null
          ? Math.round(monthlyFeeAmount * sessionsAttended)
          : null;
      const calculatedTuition =
        monthlyFeeAmount != null
          ? this.resolveTuitionToCollect(monthlyFeeAmount, sessionsAttended, collectAmount)
          : null;

      return {
        studentId: e.student.id,
        fullName: e.student.fullName,
        avatarUrl: e.student.avatarUrl,
        phone: e.student.phone,
        sessionsAttended,
        monthlyFeeAmount,
        monthlyFeeNote: monthlyFee?.note ?? null,
        baseTuition,
        collectAmount,
        calculatedTuition,
        tuitionAmount: monthlyFeeAmount ?? (invoice ? Number(invoice.totalAmount) : null),
        invoiceId: invoice?.id ?? null,
        invoiceStatus: invoice?.status ?? null,
        invoiceNumber: invoice?.invoiceNumber ?? null,
        feeEditable: this.isStudentFeeEditable(month, invoice?.status ?? null),
        collectAmountEditable: this.isCollectAmountEditable(month, invoice?.status ?? null),
      };
    });

    const totalTuition = students.reduce(
      (sum, s) => sum + (s.calculatedTuition ?? s.tuitionAmount ?? 0),
      0
    );

    const paidStudents = students.filter((s) => s.invoiceStatus === 'paid');
    const unpaidStudents = students.filter(
      (s) => s.invoiceStatus === 'issued' || s.invoiceStatus === 'overdue'
    );
    const totalCollected = paidStudents.reduce(
      (sum, s) => sum + (s.calculatedTuition ?? s.tuitionAmount ?? 0),
      0
    );

    return {
      classId: classRecord.id,
      className: classRecord.name,
      month,
      monthEditable,
      sessionCountInMonth,
      students,
      summary: {
        studentCount: students.length,
        sessionCountInMonth,
        totalTuition,
        totalExpected: totalTuition,
        totalCollected,
        paidCount: paidStudents.length,
        unpaidCount: unpaidStudents.length,
        pendingCount: students.length - paidStudents.length - unpaidStudents.length,
        invoicedCount: invoices.length,
        monthEditable,
      },
    };
  }

  async setStudentMonthlyFee(
    userId: string,
    classId: string,
    studentId: string,
    data: { month: string; amount: number; note?: string }
  ) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }

    const match = /^(\d{4})-(\d{2})$/.exec(data.month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId, status: 'active' },
    });
    if (!enrollment) {
      throw new NotFoundException('Student enrollment');
    }

    await this.assertStudentFeeEditable(classId, studentId, data.month);

    const fee = await prisma.classStudentMonthlyFee.upsert({
      where: {
        classId_studentId_month: { classId, studentId, month: data.month },
      },
      create: {
        classId,
        studentId,
        month: data.month,
        amount: data.amount,
        note: data.note?.trim() || null,
        setById: userId,
      },
      update: {
        amount: data.amount,
        note: data.note?.trim() || null,
        setById: userId,
      },
    });

    return {
      studentId,
      month: data.month,
      amount: Number(fee.amount),
      note: fee.note,
    };
  }

  async setStudentCollectAmount(
    userId: string,
    classId: string,
    studentId: string,
    data: { month: string; collectAmount: number | null }
  ) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId, status: 'active' },
    });
    if (!enrollment) {
      throw new NotFoundException('Student enrollment');
    }

    await this.assertCollectAmountEditable(classId, studentId, data.month);

    const fee = await prisma.classStudentMonthlyFee.findUnique({
      where: { classId_studentId_month: { classId, studentId, month: data.month } },
    });
    if (!fee) {
      throw new BadRequestException('Chưa set học phí/buổi cho học sinh này');
    }

    const { periodStart, periodEnd } = this.parseMonthPeriod(data.month);
    const sessionsAttended = await prisma.attendanceRecord.count({
      where: {
        studentId,
        status: { in: ['present', 'late'] },
        session: {
          classId,
          sessionDate: { gte: periodStart, lte: periodEnd },
        },
      },
    });

    if (sessionsAttended === 0) {
      throw new BadRequestException('Học sinh chưa có buổi điểm danh trong tháng này');
    }

    if (data.collectAmount != null) {
      if (data.collectAmount < 0) {
        throw new BadRequestException('Số tiền thu không hợp lệ');
      }
      if (data.collectAmount === 0) {
        throw new BadRequestException('Số tiền thu phải lớn hơn 0');
      }
    }

    const updated = await prisma.classStudentMonthlyFee.update({
      where: { classId_studentId_month: { classId, studentId, month: data.month } },
      data: {
        collectAmount: data.collectAmount,
        setById: userId,
      },
    });

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    });

    const monthlyFeeAmount = Number(updated.amount);
    const amountToCollect = this.resolveTuitionToCollect(
      monthlyFeeAmount,
      sessionsAttended,
      data.collectAmount
    );

    if (classRecord) {
      await this.syncOpenInvoiceAmount(
        classId,
        studentId,
        data.month,
        amountToCollect,
        sessionsAttended,
        classRecord.name
      );
    }

    return {
      studentId,
      month: data.month,
      monthlyFeeAmount,
      sessionsAttended,
      baseTuition: Math.round(monthlyFeeAmount * sessionsAttended),
      collectAmount: data.collectAmount,
      calculatedTuition: amountToCollect,
    };
  }

  async setStudentsMonthlyFeeBulk(
    userId: string,
    classId: string,
    data: { month: string; studentIds: string[]; amount: number; note?: string }
  ) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }

    const match = /^(\d{4})-(\d{2})$/.exec(data.month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }

    if (data.studentIds.length === 0) {
      throw new BadRequestException('No students selected');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        classId,
        studentId: { in: data.studentIds },
        status: 'active',
      },
      select: { studentId: true },
    });

    if (enrollments.length !== data.studentIds.length) {
      throw new BadRequestException('One or more students are not enrolled in this class');
    }

    this.assertFeeMonthEditable(data.month);
    for (const studentId of data.studentIds) {
      await this.assertStudentFeeEditable(classId, studentId, data.month);
    }

    const note = data.note?.trim() || null;

    await prisma.$transaction(
      data.studentIds.map((studentId) =>
        prisma.classStudentMonthlyFee.upsert({
          where: {
            classId_studentId_month: { classId, studentId, month: data.month },
          },
          create: {
            classId,
            studentId,
            month: data.month,
            amount: data.amount,
            note,
            setById: userId,
          },
          update: {
            amount: data.amount,
            note,
            setById: userId,
          },
        })
      )
    );

    return {
      month: data.month,
      amount: data.amount,
      updatedCount: data.studentIds.length,
    };
  }

  async getStudentMonthlySessions(
    userId: string,
    classId: string,
    studentId: string,
    month: string
  ) {
    const teacherId = await this.resolveTeacherId(userId);

    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }

    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId, status: 'active' },
      include: {
        student: { select: { id: true, fullName: true } },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Student enrollment');
    }

    const y = Number(match[1]);
    const m = Number(match[2]);
    const periodStart = new Date(Date.UTC(y, m - 1, 1));
    const periodEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const sessions = await prisma.session.findMany({
      where: {
        classId,
        sessionDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['scheduled', 'completed'] },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        status: true,
        notes: true,
        attendanceScreenshotUrl: true,
      },
    });

    const sessionIds = sessions.map((s) => s.id);
    const attendanceRecords =
      sessionIds.length === 0
        ? []
        : await prisma.attendanceRecord.findMany({
            where: { studentId, sessionId: { in: sessionIds } },
            select: { sessionId: true, status: true, reason: true, recordedAt: true },
          });

    const attendanceBySession = new Map(attendanceRecords.map((r) => [r.sessionId, r]));

    const sessionRows = sessions.map((session) => {
      const attendance = attendanceBySession.get(session.id);
      return {
        sessionId: session.id,
        sessionDate: session.sessionDate.toISOString().split('T')[0],
        startTime: session.startTime,
        endTime: session.endTime,
        sessionStatus: session.status,
        sessionNotes: session.notes,
        attendanceScreenshotUrl: session.attendanceScreenshotUrl,
        attendanceStatus: attendance?.status ?? null,
        attendanceReason: attendance?.reason ?? null,
        recordedAt: attendance?.recordedAt?.toISOString() ?? null,
      };
    });

    const attendedCount = sessionRows.filter(
      (s) => s.attendanceStatus === 'present' || s.attendanceStatus === 'late'
    ).length;

    return {
      studentId: enrollment.student.id,
      fullName: enrollment.student.fullName,
      month,
      attendedCount,
      totalSessions: sessionRows.length,
      sessions: sessionRows,
    };
  }

  private async assertTeacherClassAccess(userId: string, classId: string): Promise<string> {
    const teacherId = await this.resolveTeacherId(userId);
    const assignment = await prisma.classTeacher.findFirst({
      where: { teacherId, classId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this class');
    }
    return teacherId;
  }

  private parseMonthRange(month: string): { periodStart: Date; periodEnd: Date } {
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match) {
      throw new BadRequestException('Invalid month format (YYYY-MM)');
    }
    const y = Number(match[1]);
    const m = Number(match[2]);
    return {
      periodStart: new Date(Date.UTC(y, m - 1, 1)),
      periodEnd: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  }

  private async resolveClassTuitionPlan(
    centerId: string,
    classId: string,
    className: string
  ) {
    let plan = await prisma.tuitionPlan.findFirst({
      where: { centerId, classId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!plan) {
      plan = await prisma.tuitionPlan.findFirst({
        where: { centerId, classId: null, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (!plan) {
      plan = await prisma.tuitionPlan.create({
        data: {
          centerId,
          classId,
          name: `Học phí - ${className}`,
          amount: 0,
          currency: 'VND',
          billingCycle: 'monthly',
          dueDay: 10,
          isActive: true,
        },
      });
    }
    return plan;
  }

  private async syncDraftInvoiceAmount(
    invoiceId: string,
    amount: number,
    sessionsAttended: number,
    className: string,
    month: string
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { amount, totalAmount: amount },
      });
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          description: `Học phí ${className} - ${sessionsAttended} buổi (${month})`,
          quantity: sessionsAttended,
          amount,
        },
      });
    });
  }

  async getPaymentSettings(userId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        vietqrBankId: true,
        accountNo: true,
        accountName: true,
        center: { select: { name: true, settings: true } },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile');
    }

    const centerSettings = (teacher.center.settings as Record<string, string> | null) ?? {};
    const hasOwn =
      !!teacher.vietqrBankId || !!teacher.accountNo || !!teacher.accountName;

    return {
      teacherId: teacher.id,
      fullName: teacher.fullName,
      centerName: teacher.center.name,
      vietqrBankId: teacher.vietqrBankId ?? centerSettings.vietqrBankId ?? '',
      accountNo: teacher.accountNo ?? centerSettings.accountNo ?? '',
      accountName:
        teacher.accountName ??
        centerSettings.accountName ??
        centerSettings.vietqrAccountName ??
        teacher.fullName,
      usingCenterDefaults: !hasOwn,
    };
  }

  async updatePaymentSettings(
    userId: string,
    data: { vietqrBankId: string; accountNo: string; accountName: string }
  ) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: { id: true, fullName: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile');
    }

    const updated = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        vietqrBankId: data.vietqrBankId,
        accountNo: data.accountNo.trim(),
        accountName: data.accountName.trim(),
      },
      select: {
        id: true,
        fullName: true,
        vietqrBankId: true,
        accountNo: true,
        accountName: true,
        center: { select: { name: true } },
      },
    });

    return {
      teacherId: updated.id,
      fullName: updated.fullName,
      centerName: updated.center.name,
      vietqrBankId: updated.vietqrBankId ?? '',
      accountNo: updated.accountNo ?? '',
      accountName: updated.accountName ?? '',
      usingCenterDefaults: false,
    };
  }

  private async resolveTeacherBankProfile(userId: string) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      select: {
        vietqrBankId: true,
        accountNo: true,
        accountName: true,
        fullName: true,
        center: { select: { settings: true } },
      },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher profile');
    }

    const centerSettings = (teacher.center.settings as Record<string, string> | null) ?? {};
    return {
      bankAccount:
        teacher.accountNo || centerSettings.accountNo || centerSettings.vietqrBankAccount,
      bankCode:
        teacher.vietqrBankId || centerSettings.vietqrBankId || centerSettings.vietqrBankCode,
      receiverName:
        teacher.accountName ||
        centerSettings.accountName ||
        centerSettings.vietqrAccountName ||
        teacher.fullName,
    };
  }

  async exportStudentReceipt(
    userId: string,
    classId: string,
    studentId: string,
    month: string
  ) {
    await this.assertTeacherClassAccess(userId, classId);
    const { periodStart, periodEnd } = this.parseMonthRange(month);

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, centerId: true, center: { select: { name: true, settings: true } } },
    });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { classId, studentId, status: 'active' },
      include: { student: { select: { id: true, fullName: true, phone: true } } },
    });
    if (!enrollment) {
      throw new NotFoundException('Student enrollment');
    }

    const [monthlyFee, sessionsAttended] = await Promise.all([
      prisma.classStudentMonthlyFee.findUnique({
        where: { classId_studentId_month: { classId, studentId, month } },
        select: { amount: true, collectAmount: true },
      }),
      prisma.attendanceRecord.count({
        where: {
          studentId,
          status: { in: ['present', 'late'] },
          session: {
            classId,
            sessionDate: { gte: periodStart, lte: periodEnd },
          },
        },
      }),
    ]);

    if (!monthlyFee) {
      throw new BadRequestException('Chưa set học phí/buổi cho học sinh này');
    }

    const monthlyFeeAmount = Number(monthlyFee.amount);
    const calculatedTuition = this.resolveTuitionToCollect(
      monthlyFeeAmount,
      sessionsAttended,
      monthlyFee.collectAmount != null ? Number(monthlyFee.collectAmount) : null
    );
    if (calculatedTuition <= 0) {
      throw new BadRequestException('Học phí bằng 0 — học sinh chưa có buổi điểm danh');
    }

    const tuitionPlan = await this.resolveClassTuitionPlan(
      classRecord.centerId,
      classId,
      classRecord.name
    );

    let invoice = await prisma.invoice.findFirst({
      where: {
        studentId,
        tuitionPlan: { classId },
        issueDate: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (invoice) {
      if (
        invoice.status !== 'paid' &&
        invoice.status !== 'cancelled' &&
        Number(invoice.totalAmount) !== calculatedTuition
      ) {
        await this.syncDraftInvoiceAmount(
          invoice.id,
          calculatedTuition,
          sessionsAttended,
          classRecord.name,
          month
        );
      }
      if (invoice.status === 'draft') {
        await paymentService.issueInvoice(invoice.id);
        invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      }
    } else {
      const dueDay = tuitionPlan.dueDay;
      const dueDate = new Date(periodEnd);
      dueDate.setUTCDate(Math.min(dueDay, 28));

      const created = await paymentService.createInvoice({
        studentId,
        tuitionPlanId: tuitionPlan.id,
        amount: calculatedTuition,
        issueDate: periodStart.toISOString(),
        dueDate: dueDate.toISOString(),
        notes: `Học phí ${classRecord.name} tháng ${month}: ${sessionsAttended} buổi × ${monthlyFeeAmount.toLocaleString('vi-VN')}đ`,
      });

      await prisma.invoiceItem.deleteMany({ where: { invoiceId: created.id } });
      await prisma.invoiceItem.create({
        data: {
          invoiceId: created.id,
          description: `Học phí ${classRecord.name} - ${sessionsAttended} buổi (${month})`,
          quantity: sessionsAttended,
          amount: calculatedTuition,
        },
      });

      await paymentService.issueInvoice(created.id);
      invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: created.id } });
    }

    const { bankAccount, bankCode, receiverName } = await this.resolveTeacherBankProfile(userId);
    if (!bankAccount || !bankCode) {
      throw new BadRequestException(
        'Chưa cấu hình tài khoản ngân hàng SePay. Vui lòng vào Tài khoản & thu phí để cấu hình.'
      );
    }

    const invoiceDetail = await paymentService.getInvoiceById(invoice.id);
    const preview = await paymentService.previewInvoice(invoice.id, 'classic');

    let vietqr = null;
    if (invoice.status !== 'paid') {
      vietqr = await paymentService.generateVietQR({
        invoiceId: invoice.id,
        amount: Number(invoice.totalAmount),
        description: invoice.invoiceNumber,
        bankCode,
        bankAccount,
        receiverName,
      });
    }

    return {
      classId,
      className: classRecord.name,
      month,
      student: {
        id: enrollment.student.id,
        fullName: enrollment.student.fullName,
        phone: enrollment.student.phone,
      },
      sessionsAttended,
      monthlyFeeAmount,
      calculatedTuition,
      invoice: {
        id: invoiceDetail.id,
        invoiceNumber: invoiceDetail.invoiceNumber,
        status: invoiceDetail.status,
        amount: invoiceDetail.amount,
        totalAmount: invoiceDetail.totalAmount,
        issueDate: invoiceDetail.issueDate,
        dueDate: invoiceDetail.dueDate,
      },
      vietqr,
      previewHtml: preview.html,
    };
  }

  async sendStudentReceipt(
    userId: string,
    classId: string,
    studentId: string,
    month: string
  ) {
    const receipt = await this.exportStudentReceipt(userId, classId, studentId, month);
    const share = await paymentService.shareInvoiceZalo(receipt.invoice.id, userId);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });

    const amountFormatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(receipt.calculatedTuition);

    const qr = receipt.vietqr;
    const transferMessage = qr
      ? `Phiếu ${receipt.invoice.invoiceNumber}: ${amountFormatted}.\n` +
        `Chuyển khoản ${qr.receiverBank} STK ${qr.receiverAccount} (${qr.receiverName}).\n` +
        `Nội dung CK: ${qr.description}\n` +
        `Quét mã QR SePay trong phiếu thu hoặc nhập đúng nội dung khi chuyển.`
      : share.messageTemplate;

    if (student?.userId) {
      await prisma.notification.create({
        data: {
          userId: student.userId,
          type: 'tuition_invoice',
          title: 'Phiếu thu học phí',
          message: transferMessage,
          data: {
            ...(share.payload as object),
            invoiceId: receipt.invoice.id,
            qrCodeUrl: qr?.qrCodeUrl ?? null,
            paymentCode: qr?.description ?? receipt.invoice.invoiceNumber,
          },
        },
      });
    }

    return {
      ...receipt,
      share: {
        success: share.success,
        messageTemplate: transferMessage,
        note: share.note,
      },
    };
  }

  async sendClassReceiptsBulk(userId: string, classId: string, month: string) {
    await this.assertTeacherClassAccess(userId, classId);
    const classData = await this.getClassStudents(userId, classId, month);

    const sent: { studentId: string; fullName: string }[] = [];
    const skipped: { studentId: string; fullName: string; reason: string }[] = [];
    const failed: { studentId: string; fullName: string; error: string }[] = [];

    for (const student of classData.students) {
      if (student.invoiceStatus === 'paid') {
        skipped.push({ studentId: student.studentId, fullName: student.fullName, reason: 'already_paid' });
        continue;
      }
      if (student.monthlyFeeAmount == null) {
        skipped.push({ studentId: student.studentId, fullName: student.fullName, reason: 'no_fee' });
        continue;
      }
      if (student.sessionsAttended === 0) {
        skipped.push({ studentId: student.studentId, fullName: student.fullName, reason: 'no_sessions' });
        continue;
      }

      try {
        await this.sendStudentReceipt(userId, classId, student.studentId, month);
        sent.push({ studentId: student.studentId, fullName: student.fullName });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        failed.push({ studentId: student.studentId, fullName: student.fullName, error: message });
      }
    }

    return {
      classId,
      month,
      sent,
      skipped,
      failed,
      summary: {
        sentCount: sent.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
      },
    };
  }

  async confirmStudentPayment(
    userId: string,
    classId: string,
    studentId: string,
    month: string
  ) {
    const receipt = await this.exportStudentReceipt(userId, classId, studentId, month);

    if (receipt.invoice.status === 'paid') {
      return {
        ...receipt,
        alreadyPaid: true,
      };
    }

    const result = await paymentService.completeExternalBankPayment({
      invoiceId: receipt.invoice.id,
      amount: Number(receipt.invoice.totalAmount),
      paymentMethod: 'cash',
      transactionId: `manual:${receipt.invoice.id}:${userId}`,
      confirmedBy: userId,
    });

    return {
      ...receipt,
      invoice: result.invoice,
      payment: result.payment,
      alreadyPaid: result.alreadyProcessed,
    };
  }
}

export const teacherPortalService = new TeacherPortalService();
