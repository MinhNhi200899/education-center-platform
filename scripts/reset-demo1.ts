/**
 * Reset demo data for center DEMO01 and recreate deterministic accounts:
 * - 5 teachers: demo1..demo5
 * - 5 students: demo1..demo5
 *
 * Run:
 *   npx ts-node --transpile-only scripts/reset-demo1.ts
 */
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  Gender,
  StudentStatus,
  TeacherStatus,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_CENTER_CODE = 'DEMO01';
const ADMIN_EMAIL = 'admin@educationcenter.com';

function demoEmail(kind: 'student' | 'teacher', i: number) {
  return `demo${i}.${kind}@educationcenter.com`;
}

function demoPassword(i: number) {
  // >= 8 chars, deterministic
  return `demo${i}123`; // e.g. demo1123
}

async function ensureRole(name: 'student' | 'teacher') {
  return prisma.role.upsert({
    where: { name },
    create: {
      name,
      description: `${name} portal access`,
      isSystem: true,
      isActive: true,
    },
    update: {},
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

  // Delete deepest children first
  await prisma.$transaction(async (tx) => {
    if (invoiceIds.length) {
      await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    }

    await tx.invoice.deleteMany({ where: { centerId } });

    if (studentIds.length) {
      await tx.attendanceRecord.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.evaluation.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.enrollment.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.parent.deleteMany({ where: { studentId: { in: studentIds } } });
    }

    if (classIds.length) {
      await tx.session.deleteMany({ where: { classId: { in: classIds } } });
      await tx.classTeacher.deleteMany({ where: { classId: { in: classIds } } });
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
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  return { userIds, studentIds, teacherIds, classIds, invoiceIds };
}

async function seedDemo(centerId: string) {
  const studentRole = await ensureRole('student');
  const teacherRole = await ensureRole('teacher');

  // Ensure admin stays center_manager; do not modify it here.

  const createdStudents: Array<{ email: string; password: string }> = [];
  const createdTeachers: Array<{ email: string; password: string }> = [];

  for (let i = 1; i <= 5; i++) {
    // Teacher
    const tEmail = demoEmail('teacher', i);
    const tPassword = demoPassword(i);
    const tHash = await bcrypt.hash(tPassword, 12);
    const teacherUser = await prisma.user.create({
      data: {
        email: tEmail,
        passwordHash: tHash,
        phone: `09000000${i}${i}`,
        centerId,
        status: UserStatus.active,
      },
    });
    await ensureUserRole(teacherUser.id, teacherRole.id, centerId);
    await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        centerId,
        fullName: `Demo${i} Teacher`,
        dateOfBirth: new Date(`199${i}-01-0${i}`),
        gender: i % 2 === 0 ? Gender.female : Gender.male,
        phone: `09000000${i}${i}`,
        email: tEmail,
        address: 'Demo address',
        qualification: 'Demo qualification',
        specialization: 'English',
        hireDate: new Date('2024-01-01'),
        salary: 0,
        status: TeacherStatus.active,
        notes: 'demo',
        loginPassword: tPassword,
      },
    });
    createdTeachers.push({ email: tEmail, password: tPassword });

    // Student
    const sEmail = demoEmail('student', i);
    const sPassword = demoPassword(i);
    const sHash = await bcrypt.hash(sPassword, 12);
    const studentUser = await prisma.user.create({
      data: {
        email: sEmail,
        passwordHash: sHash,
        phone: `09100000${i}${i}`,
        centerId,
        status: UserStatus.active,
      },
    });
    await ensureUserRole(studentUser.id, studentRole.id, centerId);
    await prisma.student.create({
      data: {
        userId: studentUser.id,
        centerId,
        fullName: `Demo${i} Student`,
        dateOfBirth: new Date(`201${i}-02-0${i}`),
        gender: i % 2 === 0 ? Gender.female : Gender.male,
        phone: `09100000${i}${i}`,
        email: sEmail,
        address: 'Demo address',
        enrollmentDate: new Date('2024-09-01'),
        status: StudentStatus.active,
        notes: 'demo',
        loginPassword: sPassword,
      },
    });
    createdStudents.push({ email: sEmail, password: sPassword });
  }

  return { createdStudents, createdTeachers };
}

async function main() {
  const center = await prisma.center.findUnique({ where: { code: DEMO_CENTER_CODE } });
  if (!center) throw new Error(`Center not found: ${DEMO_CENTER_CODE}`);

  const deleted = await cleanupCenter(center.id);
  const seeded = await seedDemo(center.id);

  console.log(
    JSON.stringify(
      {
        center: { id: center.id, code: center.code, name: center.name },
        deletedCounts: {
          users: deleted.userIds.length,
          students: deleted.studentIds.length,
          teachers: deleted.teacherIds.length,
          classes: deleted.classIds.length,
          invoices: deleted.invoiceIds.length,
        },
        seeded,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

