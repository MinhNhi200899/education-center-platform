/**
 * Reset DEMO01 to real HSK schedule for teacher Nguyễn Minh Nhi.
 * Keeps admin; deletes other users/classes/students; recreates classes + sessions.
 *
 * Run:
 *   npx ts-node --transpile-only scripts/seed-real-hsk-schedule.ts
 */
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  Gender,
  StudentStatus,
  TeacherStatus,
  UserStatus,
  AcademicLevel,
} from '@prisma/client';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const DEMO_CENTER_CODE = 'DEMO01';
const ADMIN_EMAIL = 'admin@educationcenter.com';
const ADMIN_PASSWORD = 'admin123';

const TEACHER = {
  fullName: 'Nguyễn Minh Nhi',
  email: 'minhnhi.teacher@educationcenter.com',
  password: 'minhnhi123',
  phone: '0901000001',
};

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type Slot = { startTime: string; endTime: string; room: string };

type ClassDef = {
  name: string;
  level: AcademicLevel;
  capacity: number;
  classroom: string;
  schedule: Partial<Record<DayKey, Slot[]>>;
  students: string[]; // portal students (empty = teacher manages only)
  notes?: string;
};

const DAY_MAP: Record<DayKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const CLASSES: ClassDef[] = [
  {
    name: 'HSK 2',
    level: AcademicLevel.intermediate,
    capacity: 10,
    classroom: 'P.HSK2',
    schedule: {
      monday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK2' }],
      wednesday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK2' }],
      friday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK2' }],
    },
    students: ['Thơ'],
  },
  {
    name: 'HSK 1 (Lớp 1)',
    level: AcademicLevel.beginner,
    capacity: 15,
    classroom: 'P.HSK1-1',
    schedule: {
      monday: [{ startTime: '20:00', endTime: '21:30', room: 'P.HSK1-1' }],
      friday: [{ startTime: '20:00', endTime: '21:30', room: 'P.HSK1-1' }],
    },
    students: ['Ngân', 'Châu', 'Linh'],
  },
  {
    name: 'HSK 1 (Lớp 2)',
    level: AcademicLevel.beginner,
    capacity: 15,
    classroom: 'P.HSK1-2',
    schedule: {
      tuesday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK1-2' }],
      thursday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK1-2' }],
      saturday: [{ startTime: '18:00', endTime: '19:30', room: 'P.HSK1-2' }],
    },
    students: ['Ly', 'My'],
  },
  {
    name: 'HSK 1 Offline',
    level: AcademicLevel.beginner,
    capacity: 20,
    classroom: 'Offline',
    schedule: {
      tuesday: [{ startTime: '19:30', endTime: '21:00', room: 'Offline' }],
      thursday: [{ startTime: '19:30', endTime: '21:00', room: 'Offline' }],
    },
    // Dạy offline — chỉ tạo lớp/lịch cho GV Nhi quản lý, không tạo account học viên
    students: [],
    notes:
      'Offline T3/T5 19:30–21:00. Học viên (không có portal): Tuấn, Giang, Thúy, Khánh, Bin, Thu, Phương',
  },
  {
    name: 'HSK 3',
    level: AcademicLevel.advanced,
    capacity: 10,
    classroom: 'P.HSK3',
    schedule: {
      wednesday: [{ startTime: '21:30', endTime: '23:00', room: 'P.HSK3' }],
      friday: [{ startTime: '21:30', endTime: '23:00', room: 'P.HSK3' }],
    },
    students: ['Thảo'],
  },
  {
    name: 'HSK 1 (Lớp 4)',
    level: AcademicLevel.beginner,
    capacity: 10,
    classroom: 'P.HSK1-4',
    schedule: {
      saturday: [{ startTime: '15:00', endTime: '18:00', room: 'P.HSK1-4' }],
    },
    students: ['Mai'],
  },
];

const STUDENT_ACCOUNTS: Record<string, { email: string; password: string; gender: Gender }> = {
  Thơ: { email: 'tho.student@educationcenter.com', password: 'tho12345', gender: Gender.female },
  Ngân: { email: 'ngan.student@educationcenter.com', password: 'ngan12345', gender: Gender.female },
  Châu: { email: 'chau.student@educationcenter.com', password: 'chau12345', gender: Gender.female },
  Linh: { email: 'linh.student@educationcenter.com', password: 'linh12345', gender: Gender.female },
  Ly: { email: 'ly.student@educationcenter.com', password: 'ly1234567', gender: Gender.female },
  My: { email: 'my.student@educationcenter.com', password: 'my1234567', gender: Gender.female },
  Thảo: { email: 'thao.student@educationcenter.com', password: 'thao12345', gender: Gender.female },
  Mai: { email: 'mai.student@educationcenter.com', password: 'mai123456', gender: Gender.female },
};

const TEACHER_PERMISSIONS = [
  'classes.read',
  'attendance.read',
  'attendance.create',
  'attendance.update',
  'schedule.read',
  'schedule.create',
  'sessions.read',
  'sessions.create',
  'sessions.update',
  'sessions.delete',
  'evaluations.read',
  'evaluations.create',
  'evaluations.update',
  'payments.read',
  'tuition.read',
  'tuition.create',
  'tuition.update',
];

async function ensureRole(name: 'student' | 'teacher') {
  return prisma.role.upsert({
    where: { name },
    create: {
      name,
      description: `${name} portal access`,
      isSystem: true,
      isActive: true,
    },
    update: { isActive: true },
  });
}

async function ensureUserRole(userId: string, roleId: string, centerId: string) {
  const existing = await prisma.userRole.findFirst({
    where: { userId, roleId, centerId },
  });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, roleId, centerId } });
  }
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

async function cleanupCenter(centerId: string) {
  const users = await prisma.user.findMany({
    where: { centerId, email: { not: ADMIN_EMAIL } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  const students = await prisma.student.findMany({
    where: { centerId },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);

  const teachers = await prisma.teacher.findMany({
    where: { centerId },
    select: { id: true },
  });
  const teacherIds = teachers.map((t) => t.id);

  const classes = await prisma.class.findMany({
    where: { centerId },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);

  const invoices = await prisma.invoice.findMany({
    where: { centerId },
    select: { id: true },
  });
  const invoiceIds = invoices.map((inv) => inv.id);

  const sessions = classIds.length
    ? await prisma.session.findMany({
        where: { classId: { in: classIds } },
        select: { id: true },
      })
    : [];
  const sessionIds = sessions.map((s) => s.id);

  await prisma.$transaction(async (tx) => {
    if (invoiceIds.length) {
      await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    }
    await tx.invoice.deleteMany({ where: { centerId } });

    if (sessionIds.length) {
      await tx.homeworkSubmission.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.sessionMaterial.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.attendanceRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
    }

    if (studentIds.length) {
      await tx.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.homeworkSubmission.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.evaluation.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.classStudentMonthlyFee.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.enrollment.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.parent.deleteMany({ where: { studentId: { in: studentIds } } });
    }

    if (classIds.length) {
      await tx.session.deleteMany({ where: { classId: { in: classIds } } });
      await tx.classTeacher.deleteMany({ where: { classId: { in: classIds } } });
      await tx.classStudentMonthlyFee.deleteMany({ where: { classId: { in: classIds } } });
    }

    if (teacherIds.length) {
      await tx.evaluation.deleteMany({ where: { teacherId: { in: teacherIds } } });
      await tx.classTeacher.deleteMany({ where: { teacherId: { in: teacherIds } } });
    }

    await tx.class.deleteMany({ where: { centerId } });
    await tx.tuitionPlan.deleteMany({ where: { centerId } });
    await tx.student.deleteMany({ where: { centerId } });
    await tx.teacher.deleteMany({ where: { centerId } });

    if (userIds.length) {
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordReset.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.session.deleteMany({ where: { teacherId: { in: userIds } } });
      await tx.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  return {
    users: userIds.length,
    students: studentIds.length,
    teachers: teacherIds.length,
    classes: classIds.length,
    invoices: invoiceIds.length,
  };
}

function fullScheduleJson(partial: ClassDef['schedule']): Record<DayKey, Slot[]> {
  return {
    monday: partial.monday ?? [],
    tuesday: partial.tuesday ?? [],
    wednesday: partial.wednesday ?? [],
    thursday: partial.thursday ?? [],
    friday: partial.friday ?? [],
    saturday: partial.saturday ?? [],
    sunday: partial.sunday ?? [],
  };
}

function dateAtNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

function buildSessionsForRange(
  classId: string,
  teacherUserId: string,
  schedule: Record<DayKey, Slot[]>,
  classroom: string,
  rangeStart: Date,
  rangeEnd: Date
) {
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

  const cursor = dateAtNoon(rangeStart);
  const end = dateAtNoon(rangeEnd);
  while (cursor <= end) {
    const dayKey = (Object.keys(DAY_MAP) as DayKey[]).find((d) => DAY_MAP[d] === cursor.getDay());
    if (dayKey) {
      for (const slot of schedule[dayKey] ?? []) {
        toCreate.push({
          classId,
          teacherId: teacherUserId,
          sessionDate: dateAtNoon(cursor),
          startTime: slot.startTime,
          endTime: slot.endTime,
          classroom: slot.room || classroom,
          sessionType: 'regular',
          status: 'scheduled',
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return toCreate;
}

function writeAccountMd(accounts: {
  teacher: { email: string; password: string; fullName: string };
  students: Array<{ fullName: string; email: string; password: string; classes: string[] }>;
}) {
  const lines: string[] = [
    '# Tài khoản hệ thống',
    '',
    '## Admin',
    '',
    `| Email | Mật khẩu |`,
    `| ----- | -------- |`,
    `| ${ADMIN_EMAIL} | ${ADMIN_PASSWORD} |`,
    '',
    '## Giáo viên',
    '',
    `| Họ tên | Email | Mật khẩu |`,
    `| ------ | ----- | -------- |`,
    `| ${accounts.teacher.fullName} | ${accounts.teacher.email} | ${accounts.teacher.password} |`,
    '',
    '## Học viên',
    '',
    `| Họ tên | Email | Mật khẩu | Lớp |`,
    `| ------ | ----- | -------- | --- |`,
  ];

  for (const s of accounts.students) {
    lines.push(`| ${s.fullName} | ${s.email} | ${s.password} | ${s.classes.join(', ')} |`);
  }

  lines.push(
    '',
    '## Lịch học tuần',
    '',
    '| Thứ | Thời gian | Lớp | Học viên (portal) |',
    '| --- | --------- | --- | ----------------- |',
    '| Thứ 2 | 18:00 - 19:30 | HSK 2 | Thơ |',
    '|  | 20:00 - 21:30 | HSK 1 (Lớp 1) | Ngân, Châu, Linh |',
    '| Thứ 3 | 18:00 - 19:30 | HSK 1 (Lớp 2) | Ly, My |',
    '|  | 19:30 - 21:00 | HSK 1 Offline | *(offline — không có account; GV Nhi quản lý)* |',
    '| Thứ 4 | 18:00 - 19:30 | HSK 2 | Thơ |',
    '|  | 21:30 - 23:00 | HSK 3 | Thảo |',
    '| Thứ 5 | 18:00 - 19:30 | HSK 1 (Lớp 2) | Ly, My |',
    '|  | 19:30 - 21:00 | HSK 1 Offline | *(offline — không có account; GV Nhi quản lý)* |',
    '| Thứ 6 | 18:00 - 19:30 | HSK 2 | Thơ |',
    '|  | 20:00 - 21:30 | HSK 1 (Lớp 1) | Ngân, Châu, Linh |',
    '|  | 21:30 - 23:00 | HSK 3 | Thảo |',
    '| Thứ 7 | 15:00 - 18:00 | HSK 1 (Lớp 4) | Mai |',
    '|  | 18:00 - 19:30 | HSK 1 (Lớp 2) | Ly, My |',
    '',
    '> Lớp **HSK 1 Offline** (T3/T5 19:30–21:00): Tuấn, Giang, Thúy, Khánh, Bin, Thu, Phương — dạy offline, không tạo tài khoản portal.',
    ''
  );

  const outPath = path.join(process.cwd(), 'account.md');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

async function main() {
  const center = await prisma.center.findUnique({ where: { code: DEMO_CENTER_CODE } });
  if (!center) throw new Error(`Center not found: ${DEMO_CENTER_CODE}`);

  console.log('Cleaning center (keep admin only)...');
  const deleted = await cleanupCenter(center.id);
  console.log('Deleted:', deleted);

  const studentRole = await ensureRole('student');
  const teacherRole = await ensureRole('teacher');
  await assignPermissionsToRole(teacherRole.id, TEACHER_PERMISSIONS);
  await assignPermissionsToRole(studentRole.id, ['self.read']);

  const teacherHash = await bcrypt.hash(TEACHER.password, 12);
  const teacherUser = await prisma.user.create({
    data: {
      email: TEACHER.email,
      passwordHash: teacherHash,
      phone: TEACHER.phone,
      centerId: center.id,
      status: UserStatus.active,
    },
  });
  await ensureUserRole(teacherUser.id, teacherRole.id, center.id);

  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      centerId: center.id,
      fullName: TEACHER.fullName,
      dateOfBirth: new Date('1999-08-20'),
      gender: Gender.female,
      phone: TEACHER.phone,
      email: TEACHER.email,
      address: 'TP. Hồ Chí Minh',
      qualification: 'Giáo viên tiếng Trung',
      specialization: 'HSK',
      hireDate: new Date('2024-01-01'),
      status: TeacherStatus.active,
      loginPassword: TEACHER.password,
      notes: 'Giáo viên chính — lịch HSK thật',
    },
  });

  const enrollmentDate = new Date('2026-01-01');
  const studentIdByName = new Map<string, string>();
  const studentMeta: Array<{ fullName: string; email: string; password: string; classes: string[] }> =
    [];

  for (const [fullName, acct] of Object.entries(STUDENT_ACCOUNTS)) {
    const hash = await bcrypt.hash(acct.password, 12);
    const user = await prisma.user.create({
      data: {
        email: acct.email,
        passwordHash: hash,
        phone: null,
        centerId: center.id,
        status: UserStatus.active,
      },
    });
    await ensureUserRole(user.id, studentRole.id, center.id);

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        centerId: center.id,
        fullName,
        dateOfBirth: new Date('2012-01-01'),
        gender: acct.gender,
        email: acct.email,
        enrollmentDate,
        status: StudentStatus.active,
        loginPassword: acct.password,
        notes: 'Học viên lịch HSK thật',
      },
    });

    studentIdByName.set(fullName, student.id);
    studentMeta.push({
      fullName,
      email: acct.email,
      password: acct.password,
      classes: [],
    });
  }

  const rangeStart = startOfMonth(new Date());
  const rangeEnd = endOfMonth(addMonths(new Date(), 1));
  let totalSessions = 0;

  console.log(
    `Session range: ${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, '0')}-01 → ${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, '0')}-${rangeEnd.getDate()}`
  );

  for (const def of CLASSES) {
    const schedule = fullScheduleJson(def.schedule);
    const klass = await prisma.class.create({
      data: {
        centerId: center.id,
        name: def.name,
        academicLevel: def.level,
        capacity: def.capacity,
        schedule,
        startDate: enrollmentDate,
        classroom: def.classroom,
        notes: def.notes ?? `Lớp của GV ${TEACHER.fullName}`,
      },
    });

    await prisma.classTeacher.create({
      data: {
        classId: klass.id,
        teacherId: teacher.id,
        role: 'primary',
      },
    });

    for (const studentName of def.students) {
      const studentId = studentIdByName.get(studentName);
      if (!studentId) throw new Error(`Missing student: ${studentName}`);
      await prisma.enrollment.create({
        data: {
          studentId,
          classId: klass.id,
          startDate: enrollmentDate,
          status: 'active',
        },
      });
      const meta = studentMeta.find((s) => s.fullName === studentName);
      if (meta) meta.classes.push(def.name);
    }

    const sessions = buildSessionsForRange(
      klass.id,
      teacherUser.id,
      schedule,
      def.classroom,
      rangeStart,
      rangeEnd
    );
    if (sessions.length) {
      await prisma.session.createMany({ data: sessions });
      totalSessions += sessions.length;
    }

    console.log(`Class ${def.name}: ${def.students.length} students, ${sessions.length} sessions`);
  }

  const accountPath = writeAccountMd({
    teacher: {
      fullName: TEACHER.fullName,
      email: TEACHER.email,
      password: TEACHER.password,
    },
    students: studentMeta.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
  });

  console.log('\nDone.');
  console.log(`Teacher: ${TEACHER.email} / ${TEACHER.password}`);
  console.log(`Students: ${studentMeta.length}`);
  console.log(`Sessions: ${totalSessions}`);
  console.log(`Wrote ${accountPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
