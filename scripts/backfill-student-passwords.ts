import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config';
import { generateInitialPassword } from '../src/shared/utils/password';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: {
      OR: [{ loginPassword: null }, { loginPassword: '' }],
    },
    select: {
      id: true,
      userId: true,
      email: true,
      fullName: true,
      loginPassword: true,
    },
  });

  let updated = 0;
  let skippedNoUser = 0;
  let skippedNoEmail = 0;

  for (const s of students) {
    if (!s.userId) {
      skippedNoUser++;
      continue;
    }
    if (!s.email) {
      skippedNoEmail++;
      continue;
    }

    const initialPassword = generateInitialPassword(8);
    const passwordHash = await bcrypt.hash(initialPassword, config.bcrypt.saltRounds);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: s.userId! },
        data: { passwordHash },
      });
      await tx.student.update({
        where: { id: s.id },
        data: { loginPassword: initialPassword },
      });
    });

    updated++;
    // Keep output short but useful
    if (updated <= 5) {
      // eslint-disable-next-line no-console
      console.log(`updated: ${s.fullName} (${s.email})`);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        scanned: students.length,
        updated,
        skippedNoUser,
        skippedNoEmail,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

