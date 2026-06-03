/**
 * Development seed: demo center, admin, student accounts, RBAC permissions.
 * Run: npx ts-node --transpile-only scripts/seed-dev.ts
 */
import {
  PrismaClient,
  UserStatus,
  Gender,
  StudentStatus,
  AcademicLevel,
  EvaluationType,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

const DEMO_ADMIN_EMAIL = 'admin@educationcenter.com';
const DEMO_ADMIN_PASSWORD = 'admin123';

const DEMO_STUDENT_EMAIL = 'student@educationcenter.com';
const DEMO_STUDENT_PASSWORD = 'student123';

const CENTER_MANAGER_PERMISSIONS = [
  'centers.read',
  'centers.create',
  'centers.update',
  'centers.delete',
  'students.read',
  'students.create',
  'students.update',
  'students.delete',
  'students.export',
  'teachers.read',
  'teachers.create',
  'teachers.update',
  'teachers.delete',
  'teachers.export',
  'classes.read',
  'classes.create',
  'classes.update',
  'classes.delete',
  'attendance.read',
  'attendance.create',
  'attendance.update',
  'schedule.read',
  'schedule.create',
  'schedule.update',
  'sessions.read',
  'sessions.create',
  'sessions.update',
  'evaluations.read',
  'evaluations.create',
  'evaluations.update',
  'tuition.read',
  'tuition.create',
  'tuition.update',
  'payments.read',
  'payments.create',
  'dashboard.read',
  'dashboard.export',
  'reports.read',
  'reports.export',
  'roles.read',
  'permissions.read',
  'users.read',
  'users.update',
  'settings.read',
  'settings.update',
];

async function ensurePermission(name: string, module: string, level: number, description: string) {
  return prisma.permission.upsert({
    where: { name },
    create: { name, module, level, description },
    update: {},
  });
}

async function assignPermissionsToRole(roleId: string, permissionNames: string[]) {
  for (const permName of permissionNames) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    if (!perm) continue;

    const existing = await prisma.rolePermission.findFirst({
      where: { roleId, permissionId: perm.id },
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: perm.id },
      });
    }
  }
}

async function ensureUserRole(userId: string, roleId: string, centerId: string) {
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId, centerId },
  });

  if (!existing) {
    await prisma.userRole.create({
      data: { userId, roleId, centerId },
    });
  }
}

async function main() {
  const center = await prisma.center.upsert({
    where: { code: 'DEMO01' },
    create: {
      name: 'Demo Education Center',
      code: 'DEMO01',
      address: '123 Demo Street, Ho Chi Minh City',
      phone: '02812345678',
      email: 'demo@educationcenter.com',
      status: 'active',
    },
    update: {},
  });

  await ensurePermission('self.read', 'self', 1, 'View own linked records');
  await ensurePermission('reports.read', 'reports', 1, 'View reports');
  await ensurePermission('reports.export', 'reports', 5, 'Export reports');
  await ensurePermission('roles.read', 'roles', 1, 'View roles');
  await ensurePermission('permissions.read', 'permissions', 1, 'View permissions');
  await ensurePermission('users.read', 'users', 1, 'View users');
  await ensurePermission('users.update', 'users', 3, 'Update users');
  await ensurePermission('settings.read', 'settings', 1, 'View settings');
  await ensurePermission('settings.update', 'settings', 3, 'Update settings');
  await ensurePermission('schedule.read', 'schedule', 1, 'View teaching schedule calendar');
  await ensurePermission('schedule.create', 'schedule', 2, 'Generate sessions from class schedule');
  await ensurePermission('schedule.update', 'schedule', 3, 'Update teaching schedule');
  await ensurePermission('sessions.read', 'sessions', 1, 'View sessions');
  await ensurePermission('sessions.create', 'sessions', 2, 'Create sessions');
  await ensurePermission('sessions.update', 'sessions', 3, 'Update sessions');

  const centerManagerRole = await prisma.role.upsert({
    where: { name: 'center_manager' },
    create: {
      name: 'center_manager',
      description: 'Manages a single education center',
      isSystem: true,
      isActive: true,
    },
    update: {},
  });

  const studentRole = await prisma.role.upsert({
    where: { name: 'student' },
    create: {
      name: 'student',
      description: 'Student portal access to own records',
      isSystem: true,
      isActive: true,
    },
    update: {},
  });

  await assignPermissionsToRole(centerManagerRole.id, CENTER_MANAGER_PERMISSIONS);
  await assignPermissionsToRole(studentRole.id, ['self.read']);

  const adminHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: adminHash,
      phone: '02898765432',
      centerId: center.id,
      status: UserStatus.active,
    },
    update: {
      passwordHash: adminHash,
      status: UserStatus.active,
      centerId: center.id,
    },
  });

  await ensureUserRole(adminUser.id, centerManagerRole.id, center.id);

  const studentHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 12);
  const studentUser = await prisma.user.upsert({
    where: { email: DEMO_STUDENT_EMAIL },
    create: {
      email: DEMO_STUDENT_EMAIL,
      passwordHash: studentHash,
      phone: '0901234567',
      centerId: center.id,
      status: UserStatus.active,
    },
    update: {
      passwordHash: studentHash,
      status: UserStatus.active,
      centerId: center.id,
    },
  });

  await ensureUserRole(studentUser.id, studentRole.id, center.id);

  const enrollmentDate = new Date('2024-09-01');
  const dateOfBirth = new Date('2015-03-15');

  let studentRecord = await prisma.student.findFirst({
    where: { centerId: center.id, email: DEMO_STUDENT_EMAIL },
  });

  if (!studentRecord) {
    studentRecord = await prisma.student.create({
      data: {
        userId: studentUser.id,
        centerId: center.id,
        fullName: 'Nguyen Van Demo',
        dateOfBirth,
        gender: Gender.male,
        phone: '0901234567',
        email: DEMO_STUDENT_EMAIL,
        address: '456 Demo Ward, Ho Chi Minh City',
        enrollmentDate,
        status: StudentStatus.active,
        notes: 'Demo student account for local testing',
      },
    });
  } else {
    studentRecord = await prisma.student.update({
      where: { id: studentRecord.id },
      data: {
        userId: studentUser.id,
        fullName: 'Nguyen Van Demo',
        status: StudentStatus.active,
      },
    });
  }

  const existingParent = await prisma.parent.findFirst({
    where: { studentId: studentRecord.id, isPrimary: true },
  });

  if (!existingParent) {
    await prisma.parent.create({
      data: {
        studentId: studentRecord.id,
        fullName: 'Nguyen Thi Phu Huynh',
        relationship: 'mother',
        phone: '0907654321',
        email: 'parent.demo@educationcenter.com',
        isPrimary: true,
      },
    });
  }

  console.log('Demo accounts ready:\n');
  console.log('Admin (quản lý trung tâm):');
  console.log(`  Email:    ${DEMO_ADMIN_EMAIL}`);
  console.log(`  Password: ${DEMO_ADMIN_PASSWORD}`);
  console.log(`  Role:     center_manager`);
  console.log(`  Center:   ${center.name} (${center.code})\n`);
  console.log('Student (học sinh / portal):');
  console.log(`  Email:    ${DEMO_STUDENT_EMAIL}`);
  console.log(`  Password: ${DEMO_STUDENT_PASSWORD}`);
  console.log(`  Role:     student`);
  console.log(`  Học sinh: ${studentRecord.fullName} (id: ${studentRecord.id})`);

  const demoSchedule = {
    monday: [{ startTime: '08:00', endTime: '09:30', room: 'A101' }],
    tuesday: [{ startTime: '08:00', endTime: '09:30', room: 'A101' }],
    wednesday: [{ startTime: '08:00', endTime: '09:30', room: 'A101' }],
    thursday: [{ startTime: '08:00', endTime: '09:30', room: 'A101' }],
    friday: [{ startTime: '08:00', endTime: '09:30', room: 'A101' }],
    saturday: [{ startTime: '10:00', endTime: '11:30', room: 'A101' }],
    sunday: [],
  };

  let demoClass = await prisma.class.findFirst({
    where: { centerId: center.id, name: 'Lớp Tiếng Anh Demo' },
  });

  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        centerId: center.id,
        name: 'Lớp Tiếng Anh Demo',
        academicLevel: AcademicLevel.beginner,
        capacity: 30,
        schedule: demoSchedule,
        startDate: new Date('2024-09-01'),
        classroom: 'A101',
      },
    });
  }

  let demoTeacher = await prisma.teacher.findFirst({
    where: { centerId: center.id, email: 'teacher.demo@educationcenter.com' },
  });

  const teacherRole = await prisma.role.findUnique({ where: { name: 'teacher' } });
  if (teacherRole) {
    await assignPermissionsToRole(teacherRole.id, [
      'classes.read',
      'attendance.read',
      'attendance.create',
      'attendance.update',
      'schedule.read',
      'schedule.create',
      'sessions.read',
      'sessions.update',
      'evaluations.read',
      'evaluations.create',
      'evaluations.update',
    ]);
  }

  let teacherUser = await prisma.user.findUnique({
    where: { email: 'teacher.demo@educationcenter.com' },
  });

  if (!teacherUser) {
    const teacherHash = await bcrypt.hash('teacher123', 12);
    teacherUser = await prisma.user.create({
      data: {
        email: 'teacher.demo@educationcenter.com',
        passwordHash: teacherHash,
        centerId: center.id,
        status: UserStatus.active,
      },
    });
    if (teacherRole) {
      await ensureUserRole(teacherUser.id, teacherRole.id, center.id);
    }
  }

  if (!demoTeacher) {
    demoTeacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        centerId: center.id,
        fullName: 'Giao Vien Demo',
        dateOfBirth: new Date('1990-01-01'),
        gender: Gender.female,
        phone: '0908888888',
        email: 'teacher.demo@educationcenter.com',
        hireDate: new Date('2024-01-01'),
      },
    });
  } else if (!demoTeacher.userId) {
    demoTeacher = await prisma.teacher.update({
      where: { id: demoTeacher.id },
      data: { userId: teacherUser.id },
    });
  }

  const existingClassTeacher = await prisma.classTeacher.findFirst({
    where: { classId: demoClass.id, teacherId: demoTeacher.id },
  });

  if (!existingClassTeacher) {
    await prisma.classTeacher.create({
      data: { classId: demoClass.id, teacherId: demoTeacher.id, role: 'primary' },
    });
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_classId: { studentId: studentRecord.id, classId: demoClass.id },
    },
  });

  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        studentId: studentRecord.id,
        classId: demoClass.id,
        startDate: enrollmentDate,
        status: 'active',
      },
    });
  }

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const existingSessions = await prisma.session.count({
    where: { classId: demoClass.id, sessionDate: { gte: monthStart, lte: monthEnd } },
  });

  if (existingSessions === 0) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const toCreate: Array<{
      classId: string;
      teacherId: string;
      sessionDate: Date;
      startTime: string;
      endTime: string;
      classroom: string;
      sessionType: 'regular';
      status: 'scheduled';
    }> = [];

    const cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
      const dayName = days.find((d) => dayMap[d] === cursor.getDay());
      if (dayName && demoSchedule[dayName]?.length) {
        const slot = demoSchedule[dayName][0];
        toCreate.push({
          classId: demoClass.id,
          teacherId: teacherUser.id,
          sessionDate: new Date(cursor),
          startTime: slot.startTime,
          endTime: slot.endTime,
          classroom: slot.room || 'A101',
          sessionType: 'regular',
          status: 'scheduled',
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (toCreate.length > 0) {
      await prisma.session.createMany({ data: toCreate });
    }
  }

  console.log(`\nLớp demo điểm danh: ${demoClass.name} (id: ${demoClass.id})`);
  console.log('Giáo viên demo: teacher.demo@educationcenter.com / teacher123');

  // Demo evaluations for nhận xét học sinh (Feature #4)
  const evalDates = {
    daily: new Date(),
    weekly: subMonths(new Date(), 0),
    monthly: startOfMonth(new Date()),
  };

  const demoEvaluations: Array<{
    type: EvaluationType;
    date: Date;
    participation: number;
    homework: number;
    behavior: number;
    speaking: number;
    writing: number;
    comments: string;
  }> = [
    {
      type: 'daily',
      date: evalDates.daily,
      participation: 4,
      homework: 5,
      behavior: 4,
      speaking: 8,
      writing: 7,
      comments: 'Em tham gia tích cực, phát âm cải thiện rõ rệt.',
    },
    {
      type: 'weekly',
      date: evalDates.weekly,
      participation: 5,
      homework: 4,
      behavior: 5,
      speaking: 7.5,
      writing: 8,
      comments: 'Tuần này em hoàn thành tốt bài tập và hợp tác với bạn.',
    },
    {
      type: 'monthly',
      date: evalDates.monthly,
      participation: 4,
      homework: 4,
      behavior: 5,
      speaking: 8.5,
      writing: 8,
      comments: 'Tổng kết tháng: tiến bộ ổn định, cần luyện thêm kỹ năng viết.',
    },
  ];

  for (const ev of demoEvaluations) {
    const existing = await prisma.evaluation.findFirst({
      where: {
        studentId: studentRecord.id,
        classId: demoClass.id,
        evaluationType: ev.type,
        evaluationDate: ev.date,
      },
    });
    if (existing) continue;

    await prisma.evaluation.create({
      data: {
        studentId: studentRecord.id,
        classId: demoClass.id,
        teacherId: demoTeacher.id,
        evaluationType: ev.type,
        evaluationDate: ev.date,
        participation: ev.participation,
        homework: ev.homework,
        behavior: ev.behavior,
        scores: { speaking: ev.speaking, writing: ev.writing },
        comments: ev.comments,
      },
    });
  }

  const evalCount = await prisma.evaluation.count({
    where: { studentId: studentRecord.id, classId: demoClass.id },
  });
  console.log(`\nNhận xét demo: ${evalCount} bản ghi cho ${studentRecord.fullName}`);

  // VietQR settings on center
  await prisma.center.update({
    where: { id: center.id },
    data: {
      settings: {
        vietqrBankId: 'VCB',
        vietqrBankCode: 'VCB',
        accountNo: '1234567890',
        vietqrBankAccount: '1234567890',
        accountName: 'Demo Education Center',
        vietqrAccountName: 'Demo Education Center',
      },
    },
  });

  // Demo tuition plan for the class
  let tuitionPlan = await prisma.tuitionPlan.findFirst({
    where: { centerId: center.id, classId: demoClass.id, name: 'Học phí tháng - Tiếng Anh Demo' },
  });

  if (!tuitionPlan) {
    tuitionPlan = await prisma.tuitionPlan.create({
      data: {
        centerId: center.id,
        classId: demoClass.id,
        name: 'Học phí tháng - Tiếng Anh Demo',
        amount: 2000000,
        currency: 'VND',
        billingCycle: 'monthly',
        dueDay: 10,
        lateFee: 50000,
        notes: 'Gói học phí demo cho lớp Tiếng Anh',
        isActive: true,
      },
    });
  }

  // Seed attendance records for current month sessions (demo student present)
  const sessions = await prisma.session.findMany({
    where: { classId: demoClass.id, sessionDate: { gte: monthStart, lte: monthEnd } },
    take: 8,
  });

  for (const session of sessions) {
    await prisma.attendanceRecord.upsert({
      where: {
        studentId_sessionId: { studentId: studentRecord.id, sessionId: session.id },
      },
      create: {
        studentId: studentRecord.id,
        sessionId: session.id,
        status: 'present',
        recordedBy: teacherUser.id,
      },
      update: { status: 'present' },
    });
  }

  // Demo paid invoices + payments for revenue charts (current + previous month)
  const paidPeriods = [
    { suffix: 'CUR', monthsAgo: 0, amount: 2000000 },
    { suffix: 'PREV', monthsAgo: 1, amount: 1800000 },
  ];

  for (const { suffix, monthsAgo, amount } of paidPeriods) {
    const invNum = `INV-${new Date().getFullYear()}-DEMO-${suffix}`;
    const existingPaid = await prisma.invoice.findFirst({
      where: { centerId: center.id, invoiceNumber: invNum },
    });
    if (existingPaid) continue;

    const issue = subMonths(startOfMonth(new Date()), monthsAgo);
    const paidAt = endOfMonth(issue);

    const paidInvoice = await prisma.invoice.create({
      data: {
        centerId: center.id,
        invoiceNumber: invNum,
        studentId: studentRecord.id,
        tuitionPlanId: tuitionPlan.id,
        amount,
        discount: 0,
        totalAmount: amount,
        status: 'paid',
        issueDate: issue,
        dueDate: paidAt,
        paidDate: paidAt,
        paidAmount: amount,
        paymentMethod: 'cash',
        notes: `Phiếu thu demo đã thanh toán (${suffix})`,
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: paidInvoice.id,
        description: `Học phí ${tuitionPlan.name}`,
        quantity: 1,
        amount,
      },
    });

    await prisma.payment.create({
      data: {
        invoiceId: paidInvoice.id,
        amount,
        paymentMethod: 'cash',
        transactionDate: paidAt,
        status: 'completed',
        confirmedBy: adminUser.id,
        confirmedAt: paidAt,
      },
    });
  }

  // Sample issued invoice (overdue) for debt reminder demo
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      centerId: center.id,
      studentId: studentRecord.id,
      tuitionPlanId: tuitionPlan.id,
      status: { in: ['issued', 'overdue'] },
    },
  });

  if (!existingInvoice) {
    const overdueDue = new Date();
    overdueDue.setDate(overdueDue.getDate() - 15);

    const invoice = await prisma.invoice.create({
      data: {
        centerId: center.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-000001`,
        studentId: studentRecord.id,
        tuitionPlanId: tuitionPlan.id,
        amount: 2000000,
        discount: 0,
        totalAmount: 2000000,
        status: 'issued',
        issueDate: new Date(overdueDue.getTime() - 30 * 24 * 60 * 60 * 1000),
        dueDate: overdueDue,
        notes: 'Phiếu thu demo quá hạn để test nhắc nợ',
      },
    });

    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Học phí ${tuitionPlan.name}`,
        quantity: 1,
        amount: 2000000,
      },
    });
  }

  console.log(`\nGói học phí demo: ${tuitionPlan.name} (${tuitionPlan.amount} VND/tháng)`);
  console.log(`Điểm danh demo: ${sessions.length} buổi (present) cho học sinh demo`);
  console.log('Chạy "Tạo từ điểm danh" trên UI để sinh phiếu thu tự động.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
