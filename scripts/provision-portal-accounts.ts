import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus } from '@prisma/client';
import { config } from '../src/config';
import { generateInitialPassword } from '../src/shared/utils/password';

const prisma = new PrismaClient();

function uniqueLoginEmail(prefix: string, entityId: string): string {
  return `${prefix}.${entityId.replace(/-/g, '').slice(0, 12)}@educationcenter.com`;
}

async function resolveLoginEmail(
  preferred: string | null | undefined,
  entityId: string,
  prefix: string,
  usedEmails: Set<string>
): Promise<string> {
  const normalized = preferred?.trim().toLowerCase();
  if (normalized && !usedEmails.has(normalized)) {
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (!existing) {
      usedEmails.add(normalized);
      return normalized;
    }
  }

  let candidate = uniqueLoginEmail(prefix, entityId);
  let attempt = 0;
  while (usedEmails.has(candidate) || (await prisma.user.findUnique({ where: { email: candidate } }))) {
    attempt++;
    candidate = uniqueLoginEmail(`${prefix}${attempt}`, entityId);
  }
  usedEmails.add(candidate);
  return candidate;
}

async function provisionUserAccount(params: {
  email: string;
  phone: string | null;
  centerId: string;
  roleName: 'student' | 'teacher';
  password: string;
}): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name: params.roleName } });
  if (!role) {
    throw new Error(`Role not found: ${params.roleName}`);
  }

  const passwordHash = await bcrypt.hash(params.password, config.bcrypt.saltRounds);

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      phone: params.phone,
      centerId: params.centerId,
      status: UserStatus.active,
    },
  });

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: role.id,
      centerId: params.centerId,
    },
  });

  return user.id;
}

async function resetUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

async function main() {
  const usedEmails = new Set<string>();
  const results: Array<{ type: string; name: string; email: string; password: string; action: string }> = [];

  const students = await prisma.student.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      userId: true,
      loginPassword: true,
      centerId: true,
    },
  });

  for (const student of students) {
    const password = student.loginPassword || generateInitialPassword(8);

    if (!student.userId) {
      const loginEmail = await resolveLoginEmail(student.email, student.id, 'student', usedEmails);

      const userId = await provisionUserAccount({
        email: loginEmail,
        phone: student.phone,
        centerId: student.centerId,
        roleName: 'student',
        password,
      });

      await prisma.student.update({
        where: { id: student.id },
        data: {
          userId,
          email: loginEmail,
          loginPassword: password,
        },
      });

      results.push({
        type: 'student',
        name: student.fullName,
        email: loginEmail,
        password,
        action: 'created',
      });
      continue;
    }

    if (!student.loginPassword) {
      await resetUserPassword(student.userId, password);
      await prisma.student.update({
        where: { id: student.id },
        data: { loginPassword: password },
      });

      results.push({
        type: 'student',
        name: student.fullName,
        email: student.email || '',
        password,
        action: 'password_set',
      });
    }
  }

  const teachers = await prisma.teacher.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      userId: true,
      loginPassword: true,
      centerId: true,
    },
  });

  for (const teacher of teachers) {
    const password = teacher.loginPassword || generateInitialPassword(8);

    if (!teacher.userId) {
      const loginEmail = await resolveLoginEmail(teacher.email, teacher.id, 'teacher', usedEmails);

      const userId = await provisionUserAccount({
        email: loginEmail,
        phone: teacher.phone,
        centerId: teacher.centerId,
        roleName: 'teacher',
        password,
      });

      await prisma.teacher.update({
        where: { id: teacher.id },
        data: {
          userId,
          email: loginEmail,
          loginPassword: password,
        },
      });

      results.push({
        type: 'teacher',
        name: teacher.fullName,
        email: loginEmail,
        password,
        action: 'created',
      });
      continue;
    }

    if (!teacher.loginPassword) {
      await resetUserPassword(teacher.userId, password);
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { loginPassword: password },
      });

      results.push({
        type: 'teacher',
        name: teacher.fullName,
        email: teacher.email,
        password,
        action: 'password_set',
      });
    }
  }

  console.log(JSON.stringify({ updated: results.length, results }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
