import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const emails = [
  'teacher.demo@educationcenter.com',
  'test.zero@educationcenter.com',
  'validhd@educationcenter.com',
  'lop10czodoi@gmail.com',
  'student@example.com',
  'student.df3b63fb0c1d@educationcenter.com',
  'giabao.nguyen05@gmail.com',
  'tuyetnhi.tran.le@gmail.com',
];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, status: true, centerId: true, createdAt: true },
    orderBy: { email: 'asc' },
  });

  const roles = await prisma.userRole.findMany({
    where: { user: { email: { in: emails } } },
    select: { user: { select: { email: true } }, role: { select: { name: true } } },
  });

  const roleMap = new Map<string, string[]>();
  for (const r of roles) {
    const arr = roleMap.get(r.user.email) ?? [];
    arr.push(r.role.name);
    roleMap.set(r.user.email, arr);
  }

  console.log(
    JSON.stringify(
      {
        found: users.length,
        users: users.map((u) => ({ ...u, roles: roleMap.get(u.email) ?? [] })),
        missing: emails.filter((e) => !users.some((u) => u.email === e)),
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

