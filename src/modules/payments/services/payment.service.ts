import { PrismaClient, BillingCycle, InvoiceStatus, PaymentMethod, PaymentMethodStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import {
  CreateTuitionPlanDTO,
  UpdateTuitionPlanDTO,
  TuitionPlanFilters,
  TuitionPlanResponse,
  CreateInvoiceDTO,
  UpdateInvoiceDTO,
  InvoiceFilters,
  InvoiceResponse,
  RecordPaymentDTO,
  ConfirmPaymentDTO,
  PaymentFilters,
  PaymentResponse,
  VietQRRequest,
  VietQRResponse,
  RevenueFilters,
  RevenueResponse,
  RevenueViewMode,
  RevenueDrilldownResponse,
  MonthlyReportResponse,
  YearlyReportResponse,
  CollectionMetrics,
  OverdueInvoice,
  PaginatedResult,
  BatchGenerateInvoicesDTO,
  GenerateFromAttendanceDTO,
  GenerateFromAttendanceResult,
  SendRemindersResult,
} from '../types/payment.types';
import { NotFoundException, BadRequestException, ConflictException } from '../../../shared/types/error.types';
import { format, differenceInDays, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { renderReceiptPreview, ReceiptTheme, getAvailableThemes } from './receipt-themes.service';
import { zaloService } from './zalo.service';

export class PaymentService {
  // ================================
  // TUITION PLAN METHODS
  // ================================

  /**
   * Create a new tuition plan
   */
  async createTuitionPlan(data: CreateTuitionPlanDTO): Promise<TuitionPlanResponse> {
    // Verify center exists
    const center = await prisma.center.findUnique({ where: { id: data.centerId } });
    if (!center) {
      throw new NotFoundException('Center');
    }

    // Verify class exists if provided
    if (data.classId) {
      const classRecord = await prisma.class.findUnique({ where: { id: data.classId } });
      if (!classRecord) {
        throw new NotFoundException('Class');
      }
    }

    const plan = await prisma.tuitionPlan.create({
      data: {
        centerId: data.centerId,
        classId: data.classId || null,
        name: data.name,
        amount: data.amount,
        currency: data.currency || 'VND',
        billingCycle: data.billingCycle as BillingCycle,
        dueDay: data.dueDay,
        lateFee: data.lateFee || null,
        notes: data.notes || null,
        isActive: true,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    logger.info('Tuition plan created', { planId: plan.id, centerId: data.centerId });

    return this.formatTuitionPlan(plan);
  }

  /**
   * Get tuition plan by ID
   */
  async getTuitionPlanById(id: string): Promise<TuitionPlanResponse> {
    const plan = await prisma.tuitionPlan.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException('Tuition Plan');
    }

    return this.formatTuitionPlan(plan);
  }

  /**
   * Get all tuition plans with filters
   */
  async getAllTuitionPlans(
    filters: TuitionPlanFilters
  ): Promise<PaginatedResult<TuitionPlanResponse>> {
    const {
      centerId,
      classId,
      isActive,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (classId) where.classId = classId;
    if (isActive !== undefined) where.isActive = isActive;

    const total = await prisma.tuitionPlan.count({ where });

    const plans = await prisma.tuitionPlan.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    return {
      data: plans.map((p) => this.formatTuitionPlan(p)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update tuition plan
   */
  async updateTuitionPlan(id: string, data: UpdateTuitionPlanDTO): Promise<TuitionPlanResponse> {
    const plan = await prisma.tuitionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Tuition Plan');
    }

    const updated = await prisma.tuitionPlan.update({
      where: { id },
      data: {
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        billingCycle: data.billingCycle as BillingCycle,
        dueDay: data.dueDay,
        lateFee: data.lateFee,
        notes: data.notes,
        isActive: data.isActive,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    logger.info('Tuition plan updated', { planId: id });

    return this.formatTuitionPlan(updated);
  }

  /**
   * Delete tuition plan (soft delete by deactivating)
   */
  async deleteTuitionPlan(id: string): Promise<TuitionPlanResponse> {
    const plan = await prisma.tuitionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Tuition Plan');
    }

    const deactivated = await prisma.tuitionPlan.update({
      where: { id },
      data: { isActive: false },
      include: {
        center: { select: { id: true, name: true, code: true } },
        class: { select: { id: true, name: true } },
      },
    });

    logger.info('Tuition plan deactivated', { planId: id });

    return this.formatTuitionPlan(deactivated);
  }

  // ================================
  // INVOICE METHODS
  // ================================

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(centerId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Get the latest invoice for this year and center
    const latestInvoice = await prisma.invoice.findFirst({
      where: {
        centerId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    if (latestInvoice) {
      const lastNumber = parseInt(latestInvoice.invoiceNumber.replace(prefix, ''));
      return `${prefix}${String(lastNumber + 1).padStart(6, '0')}`;
    }

    return `${prefix}000001`;
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: CreateInvoiceDTO): Promise<InvoiceResponse> {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { center: true },
    });
    if (!student) {
      throw new NotFoundException('Student');
    }

    // Get tuition plan
    const tuitionPlan = await prisma.tuitionPlan.findUnique({
      where: { id: data.tuitionPlanId },
    });
    if (!tuitionPlan) {
      throw new NotFoundException('Tuition Plan');
    }

    const amount = data.amount || Number(tuitionPlan.amount);
    const discount = data.discount || 0;
    const totalAmount = amount - discount;

    // Calculate due date based on billing cycle
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : this.calculateDueDate(issueDate, tuitionPlan.billingCycle, tuitionPlan.dueDay);

    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const created = await tx.invoice.create({
        data: {
          centerId: student.centerId,
          invoiceNumber: await this.generateInvoiceNumber(student.centerId),
          studentId: data.studentId,
          tuitionPlanId: data.tuitionPlanId,
          amount,
          discount,
          totalAmount,
          status: 'draft',
          issueDate,
          dueDate,
          notes: data.notes || null,
        },
      });

      // Create invoice item
      await tx.invoiceItem.create({
        data: {
          invoiceId: created.id,
          description: `Tuition Fee - ${tuitionPlan.name}`,
          quantity: 1,
          amount,
        },
      });

      return created;
    });

    logger.info('Invoice created', { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber });

    return this.getInvoiceById(invoice.id);
  }

  /**
   * Batch generate invoices
   */
  async batchGenerateInvoices(data: BatchGenerateInvoicesDTO): Promise<{ generated: number; invoices: Array<{ id: string; invoiceNumber: string }> }> {
    const { studentIds, tuitionPlanId, billingDate, dueDay } = data;

    // Get tuition plan
    const tuitionPlan = await prisma.tuitionPlan.findUnique({
      where: { id: tuitionPlanId },
    });
    if (!tuitionPlan) {
      throw new NotFoundException('Tuition Plan');
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, status: 'active' },
    });

    if (students.length === 0) {
      throw new BadRequestException('No valid students found');
    }

    const issueDate = new Date(billingDate);
    const calculatedDueDay = dueDay || tuitionPlan.dueDay;
    const dueDate = this.calculateDueDateFromDay(issueDate, calculatedDueDay);

    const invoices: Array<{ id: string; invoiceNumber: string }> = [];
    let generated = 0;

    for (const student of students) {
      try {
        const amount = Number(tuitionPlan.amount);
        const totalAmount = amount;

        const invoice = await prisma.$transaction(async (tx) => {
          const created = await tx.invoice.create({
            data: {
              centerId: student.centerId,
              invoiceNumber: await this.generateInvoiceNumber(student.centerId),
              studentId: student.id,
              tuitionPlanId: tuitionPlanId,
              amount,
              discount: 0,
              totalAmount,
              status: 'draft',
              issueDate,
              dueDate,
            },
          });

          await tx.invoiceItem.create({
            data: {
              invoiceId: created.id,
              description: `Tuition Fee - ${tuitionPlan.name}`,
              quantity: 1,
              amount,
            },
          });

          return created;
        });

        invoices.push({ id: invoice.id, invoiceNumber: invoice.invoiceNumber });
        generated++;
      } catch (error) {
        logger.error('Failed to generate invoice for student', { studentId: student.id, error });
      }
    }

    logger.info('Batch invoices generated', { generated, total: studentIds.length });

    return { generated, invoices };
  }

  /**
   * Generate invoices from attendance records for a class/period.
   * Amount = sessionsAttended × (plan.amount / totalSessions) or prorated ratio.
   */
  async generateInvoicesFromAttendance(
    data: GenerateFromAttendanceDTO
  ): Promise<GenerateFromAttendanceResult> {
    const { classId, tuitionPlanId, periodStart, periodEnd, prorated = true, autoIssue = false, dueDay } = data;

    const tuitionPlan = await prisma.tuitionPlan.findUnique({ where: { id: tuitionPlanId } });
    if (!tuitionPlan || !tuitionPlan.isActive) {
      throw new NotFoundException('Tuition Plan');
    }

    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (start > end) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    const sessions = await prisma.session.findMany({
      where: {
        classId,
        sessionDate: { gte: start, lte: end },
        status: { in: ['scheduled', 'completed'] },
      },
      select: { id: true },
    });

    const totalSessions = sessions.length;
    if (totalSessions === 0) {
      throw new BadRequestException('No sessions found in the selected period');
    }

    const sessionIds = sessions.map((s) => s.id);
    const planAmount = Number(tuitionPlan.amount);
    const perSessionRate = planAmount / totalSessions;

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'active' },
      include: { student: { select: { id: true, fullName: true, centerId: true, status: true } } },
    });

    const activeStudents = enrollments
      .map((e) => e.student)
      .filter((s) => s.status === 'active');

    if (activeStudents.length === 0) {
      throw new BadRequestException('No active students enrolled in this class');
    }

    const issueDate = new Date();
    const calculatedDueDay = dueDay ?? tuitionPlan.dueDay;
    const dueDate = this.calculateDueDateFromDay(issueDate, calculatedDueDay);
    const periodLabel = `${format(start, 'MM/yyyy')}`;

    const result: GenerateFromAttendanceResult = {
      generated: 0,
      skipped: 0,
      invoices: [],
    };

    for (const student of activeStudents) {
      const attendedRecords = await prisma.attendanceRecord.findMany({
        where: {
          studentId: student.id,
          sessionId: { in: sessionIds },
          status: { in: ['present', 'late'] },
        },
      });

      const sessionsAttended = attendedRecords.length;
      if (sessionsAttended === 0) {
        result.skipped++;
        continue;
      }

      const amount = prorated
        ? Math.round((sessionsAttended / totalSessions) * planAmount)
        : Math.round(sessionsAttended * perSessionRate);

      if (amount <= 0) {
        result.skipped++;
        continue;
      }

      try {
        const invoice = await prisma.$transaction(async (tx) => {
          const created = await tx.invoice.create({
            data: {
              centerId: student.centerId,
              invoiceNumber: await this.generateInvoiceNumber(student.centerId),
              studentId: student.id,
              tuitionPlanId,
              amount,
              discount: 0,
              totalAmount: amount,
              status: autoIssue ? 'issued' : 'draft',
              issueDate,
              dueDate,
              notes: `Tự động từ điểm danh ${periodLabel}: ${sessionsAttended}/${totalSessions} buổi`,
            },
          });

          await tx.invoiceItem.create({
            data: {
              invoiceId: created.id,
              description: `Học phí ${tuitionPlan.name} - ${sessionsAttended} buổi (${periodLabel})`,
              quantity: sessionsAttended,
              amount,
            },
          });

          return created;
        });

        result.invoices.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          studentId: student.id,
          studentName: student.fullName,
          sessionsAttended,
          totalSessions,
          amount,
        });
        result.generated++;
      } catch (error) {
        logger.error('Failed to generate attendance invoice', { studentId: student.id, error });
        result.skipped++;
      }
    }

    logger.info('Invoices generated from attendance', {
      classId,
      generated: result.generated,
      skipped: result.skipped,
    });

    return result;
  }

  /**
   * Preview invoice with receipt theme (HTML + JSON metadata)
   */
  async previewInvoice(id: string, theme?: string) {
    const invoice = await this.getInvoiceById(id);
    const preview = renderReceiptPreview(invoice, (theme as ReceiptTheme) || 'classic');
    return {
      ...preview,
      themes: getAvailableThemes(),
    };
  }

  /**
   * Share invoice via Zalo (stub)
   */
  async shareInvoiceZalo(id: string, sharedByUserId?: string) {
    const invoice = await this.getInvoiceById(id);
    return zaloService.shareInvoice(invoice, sharedByUserId);
  }

  /**
   * Send debt reminders for overdue invoices (cron-ready)
   */
  async sendDebtReminders(centerId?: string): Promise<SendRemindersResult> {
    await this.updateOverdueInvoices();

    const where: any = {
      status: { in: ['issued', 'overdue'] },
      dueDate: { lt: new Date() },
    };
    if (centerId) where.centerId = centerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            parents: { where: { isPrimary: true }, select: { userId: true, fullName: true, phone: true } },
          },
        },
      },
    });

    const result: SendRemindersResult = { sent: 0, skipped: 0, notifications: [] };

    for (const invoice of invoices) {
      const parent = invoice.student.parents[0];
      const amountFormatted = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(Number(invoice.totalAmount));

      const daysOverdue = differenceInDays(new Date(), invoice.dueDate);
      const message =
        `Phiếu thu ${invoice.invoiceNumber} của em ${invoice.student.fullName} ` +
        `quá hạn ${daysOverdue} ngày. Số tiền: ${amountFormatted}. Vui lòng thanh toán sớm.`;

      let targetUserId: string | null | undefined = parent?.userId;

      if (!targetUserId) {
        const manager = await prisma.userRole.findFirst({
          where: {
            centerId: invoice.centerId,
            role: { name: 'center_manager' },
          },
          select: { userId: true },
        });
        targetUserId = manager?.userId ?? null;
      }

      if (!targetUserId) {
        result.skipped++;
        continue;
      }

      const recent = await prisma.notification.findMany({
        where: {
          userId: targetUserId,
          type: 'tuition_debt_reminder',
          createdAt: { gte: startOfMonth(new Date()) },
        },
      });

      if (recent.some((n) => (n.data as { invoiceId?: string })?.invoiceId === invoice.id)) {
        result.skipped++;
        continue;
      }

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'tuition_debt_reminder',
          title: 'Nhắc nợ học phí',
          message,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            studentId: invoice.student.id,
            daysOverdue,
            amount: Number(invoice.totalAmount),
          },
        },
      });

      result.notifications.push({
        userId: targetUserId,
        invoiceNumber: invoice.invoiceNumber,
        studentName: invoice.student.fullName,
      });
      result.sent++;
    }

    logger.info('Debt reminders sent', { sent: result.sent, skipped: result.skipped, centerId });
    return result;
  }

  /**
   * Quick confirm payment by invoice (creates completed payment in one step)
   */
  async quickConfirmInvoicePayment(
    invoiceId: string,
    data: ConfirmPaymentDTO,
    confirmedBy: string
  ): Promise<{ invoice: InvoiceResponse; payment: PaymentResponse }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    const totalPaid = invoice.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(invoice.totalAmount) - totalPaid;

    if (data.amount > remaining) {
      throw new BadRequestException(`Amount exceeds remaining balance (${remaining})`);
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        transactionId: data.transactionId || null,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        bankCode: data.bankCode || null,
        status: 'completed',
        confirmedBy,
        confirmedAt: new Date(),
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
    });

    await this.updateInvoicePaymentStatus(invoiceId);

    return {
      invoice: await this.getInvoiceById(invoiceId),
      payment: this.formatPayment(payment),
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, code: true } },
        student: {
          select: { id: true, fullName: true, center: { select: { id: true, name: true } } },
        },
        tuitionPlan: {
          include: {
            center: { select: { id: true, name: true, code: true } },
            class: { select: { id: true, name: true } },
          },
        },
        items: true,
        payments: {
          include: {
            confirmedByUser: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    return this.formatInvoice(invoice);
  }

  /**
   * Get all invoices with filters
   */
  async getAllInvoices(filters: InvoiceFilters): Promise<PaginatedResult<InvoiceResponse>> {
    const {
      centerId,
      studentId,
      status,
      startDate,
      endDate,
      overdue,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = filters;

    const where: any = {};

    if (centerId) where.centerId = centerId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    if (overdue) {
      where.status = { in: ['issued', 'overdue'] };
      where.dueDate = { lt: new Date() };
    }

    if (startDate) {
      where.issueDate = { ...where.issueDate, gte: new Date(startDate) };
    }
    if (endDate) {
      where.issueDate = { ...where.issueDate, lte: new Date(endDate) };
    }

    if (filters.search) {
      where.invoiceNumber = { contains: filters.search, mode: 'insensitive' };
    }

    // Auto-update overdue status
    await this.updateOverdueInvoices();

    const total = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        tuitionPlan: { select: { id: true, name: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    return {
      data: invoices.map((inv) => this.formatInvoice(inv as any)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, data: UpdateInvoiceDTO): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Cannot update a paid invoice');
    }

    if (data.discount !== undefined && data.discount > Number(invoice.amount)) {
      throw new BadRequestException('Discount cannot exceed invoice amount');
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        discount: data.discount,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        status: data.status,
        totalAmount: data.discount !== undefined
          ? Number(invoice.amount) - data.discount
          : undefined,
      },
    });

    logger.info('Invoice updated', { invoiceId: id });

    return this.getInvoiceById(id);
  }

  /**
   * Issue invoice (change status to issued)
   */
  async issueInvoice(id: string): Promise<InvoiceResponse> {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    await prisma.invoice.update({
      where: { id },
      data: { status: 'issued' },
    });

    logger.info('Invoice issued', { invoiceId: id });

    return this.getInvoiceById(id);
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(centerId?: string): Promise<{ data: OverdueInvoice[]; meta: { total: number; totalAmount: number } }> {
    // Update overdue status first
    await this.updateOverdueInvoices();

    const where: any = {
      status: { in: ['issued', 'overdue'] },
      dueDate: { lt: new Date() },
    };
    if (centerId) where.centerId = centerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        tuitionPlan: { select: { id: true, lateFee: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const overdueInvoices = invoices.map((inv) => {
      const daysOverdue = differenceInDays(new Date(), inv.dueDate);
      const lateFee = inv.tuitionPlan.lateFee ? Number(inv.tuitionPlan.lateFee) * daysOverdue : 0;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        student: { id: inv.student.id, fullName: inv.student.fullName },
        totalAmount: Number(inv.totalAmount),
        dueDate: inv.dueDate,
        daysOverdue,
        lateFee,
        totalWithLateFee: Number(inv.totalAmount) + lateFee,
      };
    });

    const totalAmount = overdueInvoices.reduce((sum, inv) => sum + inv.totalWithLateFee, 0);

    return {
      data: overdueInvoices,
      meta: { total: overdueInvoices.length, totalAmount },
    };
  }

  /**
   * Update overdue invoices
   */
  private async updateOverdueInvoices(): Promise<void> {
    await prisma.invoice.updateMany({
      where: {
        status: 'issued',
        dueDate: { lt: new Date() },
      },
      data: { status: 'overdue' },
    });
  }

  /**
   * Calculate due date based on billing cycle
   */
  private calculateDueDate(issueDate: Date, billingCycle: BillingCycle, dueDay: number): Date {
    const nextMonth = addMonths(issueDate, 1);
    return this.calculateDueDateFromDay(nextMonth, dueDay);
  }

  /**
   * Calculate due date from specific day of month
   */
  private calculateDueDateFromDay(date: Date, dueDay: number): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = Math.min(dueDay, new Date(year, month + 1, 0).getDate());
    return new Date(year, month, day);
  }

  // ================================
  // PAYMENT METHODS
  // ================================

  /**
   * Record a payment
   */
  async recordPayment(data: RecordPaymentDTO, confirmedBy?: string): Promise<{ invoice: InvoiceResponse; payment: PaymentResponse }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Cannot record payment for cancelled invoice');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    // Calculate remaining amount
    const totalPaid = invoice.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remainingAmount = Number(invoice.totalAmount) - totalPaid;

    if (data.amount > remainingAmount) {
      throw new BadRequestException(
        `Payment amount (${data.amount}) exceeds remaining balance (${remainingAmount})`
      );
    }

    const transactionDate = data.transactionDate ? new Date(data.transactionDate) : new Date();

    const payment = await prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        transactionId: data.transactionId || null,
        transactionDate,
        bankCode: data.bankCode || null,
        status: 'pending',
        confirmedBy: confirmedBy || null,
        confirmedAt: confirmedBy ? new Date() : null,
      },
      include: {
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
    });

    logger.info('Payment recorded', { paymentId: payment.id, invoiceId: data.invoiceId });

    return {
      invoice: await this.getInvoiceById(data.invoiceId),
      payment: this.formatPayment(payment),
    };
  }

  /**
   * Confirm payment
   */
  async confirmPayment(
    paymentId: string,
    data: ConfirmPaymentDTO,
    confirmedBy: string
  ): Promise<{ invoice: InvoiceResponse; payment: PaymentResponse }> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment');
    }

    if (payment.status === 'completed') {
      throw new BadRequestException('Payment is already confirmed');
    }

    const confirmed = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        transactionId: data.transactionId || payment.transactionId,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : payment.transactionDate,
        bankCode: data.bankCode || payment.bankCode,
        confirmedBy,
        confirmedAt: new Date(),
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
    });

    // Update invoice status if fully paid
    await this.updateInvoicePaymentStatus(payment.invoiceId);

    logger.info('Payment confirmed', { paymentId });

    return {
      invoice: await this.getInvoiceById(payment.invoiceId),
      payment: this.formatPayment(confirmed),
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentResponse> {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            student: { select: { id: true, fullName: true } },
          },
        },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment');
    }

    return this.formatPayment(payment);
  }

  /**
   * Get all payments with filters
   */
  async getAllPayments(filters: PaymentFilters): Promise<PaginatedResult<PaymentResponse>> {
    const {
      invoiceId,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = 'transactionDate',
      order = 'desc',
    } = filters;

    const where: any = {};

    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (startDate) {
      where.transactionDate = { ...where.transactionDate, gte: new Date(startDate) };
    }
    if (endDate) {
      where.transactionDate = { ...where.transactionDate, lte: new Date(endDate) };
    }

    const total = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: { student: { select: { id: true, fullName: true } } },
        },
        confirmedByUser: { select: { id: true, fullName: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sort]: order },
    });

    return {
      data: payments.map((p) => this.formatPayment(p)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update invoice payment status based on payments
   */
  private async updateInvoicePaymentStatus(invoiceId: string): Promise<void> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) return;

    const totalPaid = invoice.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    let status: InvoiceStatus = invoice.status;
    let paidDate = invoice.paidDate;
    let paidAmount = totalPaid;
    let paymentMethod = invoice.paymentMethod;

    if (totalPaid >= Number(invoice.totalAmount)) {
      status = 'paid';
      paidDate = new Date();
      paidAmount = totalPaid;
      // Get the last completed payment method
      const lastPayment = invoice.payments
        .filter((p) => p.status === 'completed')
        .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())[0];
      if (lastPayment) {
        paymentMethod = lastPayment.paymentMethod;
      }
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status, paidDate, paidAmount, paymentMethod },
    });
  }

  // ================================
  // VIETQR METHODS
  // ================================

  /**
   * Generate VietQR code for an invoice
   */
  async generateVietQR(data: VietQRRequest): Promise<VietQRResponse> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        center: true,
        student: { select: { fullName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    // Calculate outstanding amount
    const payments = await prisma.payment.findMany({
      where: { invoiceId: data.invoiceId, status: 'completed' },
    });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstanding = Number(invoice.totalAmount) - totalPaid;
    const amount = data.amount || outstanding;

    // Get bank details from center settings or use default
    const centerSettings = invoice.center.settings as any || {};
    const bankAccount =
      centerSettings.accountNo || centerSettings.vietqrBankAccount || '123456789';
    const bankCode =
      centerSettings.vietqrBankId || centerSettings.vietqrBankCode || 'VCB';
    const receiverName =
      centerSettings.accountName || centerSettings.vietqrAccountName || invoice.center.name;
    const receiverBank = this.getBankName(bankCode);

    // Generate QR code URL (in production, this would call VietQR API)
    const description = data.description || `Thanh toán ${invoice.invoiceNumber}`;
    const qrCodeUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(description)}`;

    return {
      qrCode: qrCodeUrl,
      qrCodeUrl,
      amount,
      receiverName,
      receiverBank,
      receiverAccount: bankAccount,
      description,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  /**
   * Get bank name from bank code
   */
  private getBankName(bankCode: string): string {
    const banks: Record<string, string> = {
      VCB: 'Vietcombank',
      VTB: 'VietinBank',
      BIDV: 'BIDV',
      CTG: 'Commerzbank',
      TCB: 'Techcombank',
      ACB: 'ACB',
      MBB: 'MB Bank',
      VPBank: 'VP Bank',
    };
    return banks[bankCode] || bankCode;
  }

  // ================================
  // REVENUE & METRICS METHODS
  // ================================

  private resolveRevenuePeriod(filters: RevenueFilters): {
    periodStart: Date;
    periodEnd: Date;
    previousPeriodStart: Date;
    previousPeriodEnd: Date;
  } {
    const { period, startDate, endDate, year, month } = filters;
    const now = new Date();

    if (startDate && endDate) {
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const periodLength = periodEnd.getTime() - periodStart.getTime();
      return {
        periodStart,
        periodEnd,
        previousPeriodStart: new Date(periodStart.getTime() - periodLength),
        previousPeriodEnd: new Date(periodStart.getTime() - 1),
      };
    }

    if (year !== undefined && month !== undefined) {
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = endOfMonth(periodStart);
      const previousPeriodStart = startOfMonth(subMonths(periodStart, 1));
      const previousPeriodEnd = endOfMonth(previousPeriodStart);
      return { periodStart, periodEnd, previousPeriodStart, previousPeriodEnd };
    }

    if (year !== undefined) {
      const periodStart = new Date(year, 0, 1);
      const periodEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      const previousPeriodStart = new Date(year - 1, 0, 1);
      const previousPeriodEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      return { periodStart, periodEnd, previousPeriodStart, previousPeriodEnd };
    }

    let periodStart: Date;
    const periodEnd: Date = now;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (period) {
      case 'day': {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
        previousPeriodEnd = new Date(periodStart.getTime() - 1);
        break;
      }
      case 'week': {
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        previousPeriodStart = new Date(periodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        previousPeriodEnd = new Date(periodStart.getTime() - 1);
        break;
      }
      case 'year': {
        periodStart = new Date(now.getFullYear(), 0, 1);
        previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1);
        previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
      }
      case 'month':
      default: {
        periodStart = startOfMonth(now);
        previousPeriodStart = startOfMonth(subMonths(periodStart, 1));
        previousPeriodEnd = endOfMonth(previousPeriodStart);
        break;
      }
    }

    return { periodStart, periodEnd, previousPeriodStart, previousPeriodEnd };
  }

  private buildCompletedPaymentWhere(
    centerId: string | undefined,
    classId: string | undefined,
    periodStart: Date,
    periodEnd: Date
  ) {
    const invoiceFilter: Record<string, unknown> = {};
    if (centerId) invoiceFilter.centerId = centerId;
    if (classId) invoiceFilter.tuitionPlan = { classId };

    return {
      status: 'completed' as const,
      transactionDate: { gte: periodStart, lte: periodEnd },
      ...(Object.keys(invoiceFilter).length > 0 ? { invoice: invoiceFilter } : {}),
    };
  }

  /**
   * Get revenue metrics
   */
  async getRevenue(filters: RevenueFilters): Promise<RevenueResponse> {
    const { centerId, classId, view = 'summary', year, month } = filters;
    const { periodStart, periodEnd, previousPeriodStart, previousPeriodEnd } =
      this.resolveRevenuePeriod(filters);

    const where = this.buildCompletedPaymentWhere(centerId, classId, periodStart, periodEnd);
    const previousWhere = this.buildCompletedPaymentWhere(
      centerId,
      classId,
      previousPeriodStart,
      previousPeriodEnd
    );

    const paymentInclude = {
      invoice: {
        select: {
          id: true,
          centerId: true,
          studentId: true,
          student: { select: { id: true, fullName: true } },
          tuitionPlan: {
            select: {
              classId: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      },
    };

    const [currentPayments, previousPayments] = await Promise.all([
      prisma.payment.findMany({ where, include: paymentInclude }),
      prisma.payment.findMany({ where: previousWhere }),
    ]);

    const totalRevenue = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const previousPeriod = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const growthRate =
      previousPeriod > 0
        ? ((totalRevenue - previousPeriod) / previousPeriod) * 100
        : totalRevenue > 0
          ? 100
          : 0;

    const outstandingAmount = await this.getOutstandingAmount(centerId);
    const totalBilled = totalRevenue + outstandingAmount;
    const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;

    const revenueByClass = await this.getRevenueByClass(
      centerId,
      classId,
      periodStart,
      periodEnd
    );

    const byStudent =
      view === 'by_student' || view === 'summary'
        ? this.aggregateRevenueByStudent(currentPayments)
        : [];

    const trend =
      view === 'trend' && year !== undefined && month === undefined
        ? this.calculateMonthlyRevenueTrend(currentPayments, periodStart, periodEnd)
        : this.calculateRevenueTrend(currentPayments, periodStart, periodEnd);

    return {
      view: view as RevenueViewMode,
      period: {
        startDate: format(periodStart, 'yyyy-MM-dd'),
        endDate: format(periodEnd, 'yyyy-MM-dd'),
        ...(year !== undefined ? { year } : {}),
        ...(month !== undefined ? { month } : {}),
      },
      totalRevenue,
      previousPeriod,
      growthRate: Math.round(growthRate * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      outstandingAmount,
      byClass: revenueByClass,
      byStudent,
      trend,
    };
  }

  /**
   * Student-level revenue breakdown for a class and period (drill-down)
   */
  async getRevenueDrilldown(
    classId: string,
    filters: Omit<RevenueFilters, 'classId' | 'view'>
  ): Promise<RevenueDrilldownResponse> {
    const { centerId, year, month } = filters;
    const { periodStart, periodEnd } = this.resolveRevenuePeriod(filters);

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, centerId: true },
    });
    if (!classRecord) {
      throw new NotFoundException('Class');
    }
    if (centerId && classRecord.centerId !== centerId) {
      throw new BadRequestException('Class does not belong to this center');
    }

    const where = this.buildCompletedPaymentWhere(
      centerId || classRecord.centerId,
      classId,
      periodStart,
      periodEnd
    );

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            studentId: true,
            student: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const studentMap = new Map<
      string,
      { studentName: string; revenue: number; invoicesPaid: Set<string>; lastPaymentDate: Date | null }
    >();

    for (const payment of payments) {
      const student = payment.invoice.student;
      if (!student) continue;

      const existing = studentMap.get(student.id) || {
        studentName: student.fullName,
        revenue: 0,
        invoicesPaid: new Set<string>(),
        lastPaymentDate: null,
      };
      existing.revenue += Number(payment.amount);
      existing.invoicesPaid.add(payment.invoice.id);
      if (
        !existing.lastPaymentDate ||
        payment.transactionDate > existing.lastPaymentDate
      ) {
        existing.lastPaymentDate = payment.transactionDate;
      }
      studentMap.set(student.id, existing);
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'active' },
      include: { student: { select: { id: true, fullName: true } } },
    });

    for (const enrollment of enrollments) {
      if (!studentMap.has(enrollment.studentId)) {
        studentMap.set(enrollment.studentId, {
          studentName: enrollment.student.fullName,
          revenue: 0,
          invoicesPaid: new Set(),
          lastPaymentDate: null,
        });
      }
    }

    const students = Array.from(studentMap.entries())
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.studentName,
        revenue: data.revenue,
        invoicesPaid: data.invoicesPaid.size,
        lastPaymentDate: data.lastPaymentDate
          ? format(data.lastPaymentDate, 'yyyy-MM-dd')
          : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = students.reduce((sum, s) => sum + s.revenue, 0);

    return {
      classId: classRecord.id,
      className: classRecord.name,
      period: {
        startDate: format(periodStart, 'yyyy-MM-dd'),
        endDate: format(periodEnd, 'yyyy-MM-dd'),
        ...(year !== undefined ? { year } : {}),
        ...(month !== undefined ? { month } : {}),
      },
      totalRevenue,
      students,
    };
  }

  /**
   * Monthly operations report
   */
  async getMonthlyReport(
    centerId: string | undefined,
    year?: number,
    month?: number
  ): Promise<MonthlyReportResponse> {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;

    const revenue = await this.getRevenue({
      centerId,
      year: y,
      month: m,
      view: 'summary',
    });

    const collection = await this.getCollectionMetrics(centerId);

    const studentWhere = centerId ? { centerId } : {};
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = endOfMonth(monthStart);

    const [totalStudents, newEnrollments] = await Promise.all([
      prisma.student.count({ where: { ...studentWhere, status: 'active' } }),
      prisma.enrollment.count({
        where: {
          ...(centerId
            ? { student: { centerId } }
            : {}),
          enrolledAt: { gte: monthStart, lte: monthEnd },
        },
      }),
    ]);

    const attendanceRecords = await prisma.attendanceRecord.count({
      where: {
        session: {
          sessionDate: { gte: monthStart, lte: monthEnd },
          ...(centerId ? { class: { centerId } } : {}),
        },
      },
    });
    const presentCount = await prisma.attendanceRecord.count({
      where: {
        status: 'present',
        session: {
          sessionDate: { gte: monthStart, lte: monthEnd },
          ...(centerId ? { class: { centerId } } : {}),
        },
      },
    });
    const averageAttendance =
      attendanceRecords > 0 ? (presentCount / attendanceRecords) * 100 : 0;

    return {
      type: 'monthly',
      generatedAt: new Date().toISOString(),
      year: y,
      month: m,
      summary: {
        totalRevenue: revenue.totalRevenue,
        previousPeriodRevenue: revenue.previousPeriod,
        growthRate: revenue.growthRate,
        collectionRate: revenue.collectionRate,
        outstandingAmount: revenue.outstandingAmount,
        totalStudents,
        newEnrollments,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        paidInvoices: collection.paidInvoices,
        issuedInvoices: collection.issuedInvoices,
        overdueInvoices: collection.overdueInvoices,
      },
      sections: [
        {
          title: 'Doanh thu theo lớp',
          data: revenue.byClass.map((c) => ({
            label: c.className,
            value: c.revenue,
          })),
        },
      ],
      revenueByClass: revenue.byClass,
      trend: revenue.trend,
    };
  }

  /**
   * Yearly operations report
   */
  async getYearlyReport(
    centerId: string | undefined,
    year?: number
  ): Promise<YearlyReportResponse> {
    const now = new Date();
    const y = year ?? now.getFullYear();

    const revenue = await this.getRevenue({
      centerId,
      year: y,
      view: 'trend',
    });

    const collection = await this.getCollectionMetrics(centerId);
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);

    const studentWhere = centerId ? { centerId } : {};
    const [totalStudents, newEnrollments] = await Promise.all([
      prisma.student.count({ where: { ...studentWhere, status: 'active' } }),
      prisma.enrollment.count({
        where: {
          ...(centerId ? { student: { centerId } } : {}),
          enrolledAt: { gte: yearStart, lte: yearEnd },
        },
      }),
    ]);

    const monthlyTrend: YearlyReportResponse['monthlyTrend'] = [];
    for (let m = 1; m <= 12; m++) {
      const monthRevenue = await this.getRevenue({
        centerId,
        year: y,
        month: m,
        view: 'summary',
      });
      monthlyTrend.push({
        month: m,
        label: `T${m}`,
        amount: monthRevenue.totalRevenue,
      });
    }

    return {
      type: 'yearly',
      generatedAt: new Date().toISOString(),
      year: y,
      summary: {
        totalRevenue: revenue.totalRevenue,
        previousPeriodRevenue: revenue.previousPeriod,
        growthRate: revenue.growthRate,
        collectionRate: revenue.collectionRate,
        outstandingAmount: revenue.outstandingAmount,
        totalStudents,
        newEnrollments,
        averageAttendance: 0,
        paidInvoices: collection.paidInvoices,
        issuedInvoices: collection.issuedInvoices,
        overdueInvoices: collection.overdueInvoices,
      },
      sections: [
        {
          title: 'Doanh thu theo tháng',
          data: monthlyTrend.map((t) => ({ label: t.label, value: t.amount })),
        },
      ],
      monthlyTrend,
      revenueByClass: revenue.byClass,
    };
  }

  private aggregateRevenueByStudent(
    payments: Array<{
      amount: Decimal;
      invoice: {
        studentId: string;
        student: { id: string; fullName: string } | null;
      };
    }>
  ): RevenueResponse['byStudent'] {
    const map = new Map<string, { studentName: string; revenue: number; paymentCount: number }>();

    for (const payment of payments) {
      const student = payment.invoice.student;
      if (!student) continue;
      const existing = map.get(student.id) || {
        studentName: student.fullName,
        revenue: 0,
        paymentCount: 0,
      };
      existing.revenue += Number(payment.amount);
      existing.paymentCount += 1;
      map.set(student.id, existing);
    }

    return Array.from(map.entries())
      .map(([studentId, data]) => ({
        studentId,
        studentName: data.studentName,
        revenue: data.revenue,
        paymentCount: data.paymentCount,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private calculateMonthlyRevenueTrend(
    payments: Array<{ amount: Decimal; transactionDate: Date }>,
    startDate: Date,
    endDate: Date
  ): RevenueResponse['trend'] {
    const trendMap = new Map<string, number>();
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const key = format(current, 'yyyy-MM');
      trendMap.set(key, 0);
      current.setMonth(current.getMonth() + 1);
    }

    for (const payment of payments) {
      const key = format(payment.transactionDate, 'yyyy-MM');
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) || 0) + Number(payment.amount));
      }
    }

    return Array.from(trendMap.entries()).map(([date, amount]) => ({
      date,
      amount,
      label: date,
    }));
  }

  /**
   * Get outstanding amount
   */
  private async getOutstandingAmount(centerId?: string): Promise<number> {
    const where: any = {
      status: { in: ['issued', 'overdue'] },
    };
    if (centerId) where.centerId = centerId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { payments: true },
    });

    let total = 0;
    for (const invoice of invoices) {
      const paid = invoice.payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      total += Number(invoice.totalAmount) - paid;
    }

    return total;
  }

  /**
   * Get revenue breakdown by class (via tuition plan)
   */
  private async getRevenueByClass(
    centerId: string | undefined,
    classId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ classId: string; className: string; revenue: number }>> {
    const where = this.buildCompletedPaymentWhere(centerId, classId, startDate, endDate);

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          include: {
            tuitionPlan: {
              include: { class: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    const revenueMap = new Map<string, { className: string; revenue: number }>();

    for (const payment of payments) {
      const classInfo = payment.invoice.tuitionPlan?.class;
      if (!classInfo) continue;
      const existing = revenueMap.get(classInfo.id) || {
        className: classInfo.name,
        revenue: 0,
      };
      existing.revenue += Number(payment.amount);
      revenueMap.set(classInfo.id, existing);
    }

    return Array.from(revenueMap.entries())
      .map(([id, data]) => ({
        classId: id,
        className: data.className,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Calculate revenue trend
   */
  private calculateRevenueTrend(
    payments: Array<{ amount: Decimal; transactionDate: Date }>,
    startDate: Date,
    endDate: Date
  ): Array<{ date: string; amount: number }> {
    const trendMap = new Map<string, number>();

    // Initialize all dates in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      trendMap.set(dateStr, 0);
      current.setDate(current.getDate() + 1);
    }

    // Sum payments by date
    for (const payment of payments) {
      const dateStr = format(payment.transactionDate, 'yyyy-MM-dd');
      const current = trendMap.get(dateStr) || 0;
      trendMap.set(dateStr, current + Number(payment.amount));
    }

    return Array.from(trendMap.entries()).map(([date, amount]) => ({ date, amount }));
  }

  /**
   * Get collection metrics
   */
  async getCollectionMetrics(
    centerId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<CollectionMetrics> {
    const where: any = {};
    if (centerId) where.centerId = centerId;

    // Count by status
    const statusCounts = await prisma.invoice.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const countsByStatus = statusCounts.reduce((acc, item) => {
      acc[item.status as InvoiceStatus] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Calculate totals
    const issuedInvoices = (countsByStatus['issued'] || 0) + (countsByStatus['overdue'] || 0);
    const paidInvoices = countsByStatus['paid'] || 0;
    const overdueInvoices = countsByStatus['overdue'] || 0;
    const cancelledInvoices = countsByStatus['cancelled'] || 0;

    // Get total amounts
    const invoices = await prisma.invoice.findMany({
      where,
      include: { payments: true },
    });

    let totalIssued = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    for (const invoice of invoices) {
      const paid = invoice.payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      totalIssued += Number(invoice.totalAmount);
      totalCollected += paid;
      totalOutstanding += Number(invoice.totalAmount) - paid;
    }

    const collectionRate = totalIssued > 0 ? (totalCollected / totalIssued) * 100 : 0;

    // Calculate average payment time (in days)
    const paidInvoicesData = await prisma.invoice.findMany({
      where: { status: 'paid', paidDate: { not: null } },
      include: { payments: { where: { status: 'completed' } } },
    });

    let totalPaymentDays = 0;
    let paymentCount = 0;

    for (const invoice of paidInvoicesData) {
      const firstPayment = invoice.payments.sort((a, b) =>
        a.transactionDate.getTime() - b.transactionDate.getTime()
      )[0];
      if (firstPayment) {
        const days = differenceInDays(firstPayment.transactionDate, invoice.issueDate);
        totalPaymentDays += days;
        paymentCount++;
      }
    }

    const averagePaymentTime = paymentCount > 0 ? totalPaymentDays / paymentCount : 0;

    return {
      issuedInvoices,
      paidInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalIssued,
      totalCollected,
      totalOutstanding,
      collectionRate: Math.round(collectionRate * 100) / 100,
      averagePaymentTime: Math.round(averagePaymentTime * 10) / 10,
      byStatus: {
        draft: countsByStatus['draft'] || 0,
        issued: countsByStatus['issued'] || 0,
        paid: countsByStatus['paid'] || 0,
        overdue: countsByStatus['overdue'] || 0,
        cancelled: countsByStatus['cancelled'] || 0,
      },
    };
  }

  // ================================
  // FORMAT HELPERS
  // ================================

  private formatTuitionPlan(plan: any): TuitionPlanResponse {
    return {
      id: plan.id,
      name: plan.name,
      amount: Number(plan.amount),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      dueDay: plan.dueDay,
      lateFee: plan.lateFee ? Number(plan.lateFee) : null,
      notes: plan.notes,
      isActive: plan.isActive,
      centerId: plan.centerId,
      classId: plan.classId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      center: plan.center ? { id: plan.center.id, name: plan.center.name, code: plan.center.code } : undefined,
      class: plan.class ? { id: plan.class.id, name: plan.class.name } : null,
    };
  }

  private formatInvoice(invoice: any): InvoiceResponse {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      discount: Number(invoice.discount),
      totalAmount: Number(invoice.totalAmount),
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      paidAmount: invoice.paidAmount ? Number(invoice.paidAmount) : null,
      paymentMethod: invoice.paymentMethod,
      notes: invoice.notes,
      centerId: invoice.centerId,
      studentId: invoice.studentId,
      tuitionPlanId: invoice.tuitionPlanId,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      student: invoice.student
        ? {
            id: invoice.student.id,
            fullName: invoice.student.fullName,
            center: invoice.student.center,
          }
        : undefined,
      tuitionPlan: invoice.tuitionPlan ? this.formatTuitionPlan(invoice.tuitionPlan) : undefined,
      items: invoice.items?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        amount: Number(item.amount),
        createdAt: item.createdAt,
      })),
      payments: invoice.payments?.map((p: any) => this.formatPayment(p)),
    };
  }

  private formatPayment(payment: any): PaymentResponse {
    return {
      id: payment.id,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      transactionDate: payment.transactionDate,
      bankCode: payment.bankCode,
      qrCodeUrl: payment.qrCodeUrl,
      status: payment.status,
      confirmedBy: payment.confirmedBy,
      confirmedAt: payment.confirmedAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            student: payment.invoice.student,
          }
        : undefined,
      confirmedByUser: payment.confirmedByUser
        ? { id: payment.confirmedByUser.id, fullName: payment.confirmedByUser.fullName }
        : undefined,
    };
  }
}

// Decimal type for TypeScript
type Decimal = { toString(): string };

export const paymentService = new PaymentService();
export default paymentService;