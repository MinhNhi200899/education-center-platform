-- Demo accounts for Neon (run in Neon SQL Editor after prisma db push)
-- Admin:  admin@educationcenter.com / admin123  (role: center_manager)
-- Student: student@educationcenter.com / student123 (role: student)
--
-- Prefer: DATABASE_URL="<neon>" npx ts-node --transpile-only scripts/seed-dev.ts

-- 1) Center
INSERT INTO "Center" (id, name, code, address, phone, email, timezone, settings, status, "createdAt", "updatedAt")
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Demo Education Center',
  'DEMO01',
  '123 Demo Street, Ho Chi Minh City',
  '02812345678',
  'demo@educationcenter.com',
  'Asia/Ho_Chi_Minh',
  '{}'::jsonb,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'active',
  "updatedAt" = NOW();

-- 2) Roles
INSERT INTO "Role" (id, name, description, "isSystem", "isActive", "createdAt", "updatedAt")
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'center_manager', 'Manages education center', true, true, NOW(), NOW()),
  ('b0000000-0000-4000-8000-000000000002', 'student', 'Student portal', true, true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET "isActive" = true, "updatedAt" = NOW();

-- 3) Core permissions (admin needs many; student only self.read)
INSERT INTO "Permission" (id, name, module, level, description, "createdAt")
VALUES
  (gen_random_uuid(), 'self.read', 'self', 1, 'View own records', NOW()),
  (gen_random_uuid(), 'dashboard.read', 'dashboard', 1, 'View dashboard', NOW()),
  (gen_random_uuid(), 'students.read', 'students', 1, 'View students', NOW()),
  (gen_random_uuid(), 'students.create', 'students', 2, 'Create students', NOW()),
  (gen_random_uuid(), 'students.update', 'students', 3, 'Update students', NOW()),
  (gen_random_uuid(), 'students.delete', 'students', 4, 'Delete students', NOW()),
  (gen_random_uuid(), 'teachers.read', 'teachers', 1, 'View teachers', NOW()),
  (gen_random_uuid(), 'classes.read', 'classes', 1, 'View classes', NOW()),
  (gen_random_uuid(), 'classes.create', 'classes', 2, 'Create classes', NOW()),
  (gen_random_uuid(), 'classes.update', 'classes', 3, 'Update classes', NOW()),
  (gen_random_uuid(), 'attendance.read', 'attendance', 1, 'View attendance', NOW()),
  (gen_random_uuid(), 'attendance.create', 'attendance', 2, 'Mark attendance', NOW()),
  (gen_random_uuid(), 'attendance.update', 'attendance', 3, 'Update attendance', NOW()),
  (gen_random_uuid(), 'tuition.read', 'tuition', 1, 'View tuition', NOW()),
  (gen_random_uuid(), 'tuition.create', 'tuition', 2, 'Create tuition', NOW()),
  (gen_random_uuid(), 'payments.read', 'payments', 1, 'View payments', NOW()),
  (gen_random_uuid(), 'reports.read', 'reports', 1, 'View reports', NOW()),
  (gen_random_uuid(), 'reports.export', 'reports', 5, 'Export reports', NOW()),
  (gen_random_uuid(), 'evaluations.read', 'evaluations', 1, 'View evaluations', NOW()),
  (gen_random_uuid(), 'evaluations.create', 'evaluations', 2, 'Create evaluations', NOW()),
  (gen_random_uuid(), 'schedule.read', 'schedule', 1, 'View schedule', NOW()),
  (gen_random_uuid(), 'sessions.read', 'sessions', 1, 'View sessions', NOW()),
  (gen_random_uuid(), 'roles.read', 'roles', 1, 'View roles', NOW()),
  (gen_random_uuid(), 'settings.read', 'settings', 1, 'View settings', NOW())
ON CONFLICT (name) DO NOTHING;

-- 4) Grant center_manager all permissions; student only self.read
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r.name = 'center_manager'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );

INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, NOW()
FROM "Role" r
JOIN "Permission" p ON p.name = 'self.read'
WHERE r.name = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );

-- 5) Users (bcrypt cost 12: admin123 / student123)
INSERT INTO "User" (id, "centerId", email, "passwordHash", phone, status, "failedLoginCount", "createdAt", "updatedAt")
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'admin@educationcenter.com',
    '$2b$12$x3RXHVe2EYMPiKslaEO3huIZ0pqGZSWQIalb/a4q2hYZpYmyjBTP.',
    '02898765432',
    'active'::"UserStatus",
    0,
    NOW(),
    NOW()
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'student@educationcenter.com',
    '$2b$12$kBlYfvx7tTER.Oct6sOiD.JdASrL9iBFgG3M3C4F2/Fh3S6DfXKSm',
    '0901234567',
    'active'::"UserStatus",
    0,
    NOW(),
    NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  status = 'active'::"UserStatus",
  "centerId" = EXCLUDED."centerId",
  "updatedAt" = NOW();

-- 6) User roles
INSERT INTO "UserRole" (id, "userId", "roleId", "centerId", "createdAt")
SELECT gen_random_uuid(), u.id, r.id, 'a0000000-0000-4000-8000-000000000001', NOW()
FROM "User" u
JOIN "Role" r ON r.name = 'center_manager'
WHERE u.email = 'admin@educationcenter.com'
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur
    WHERE ur."userId" = u.id AND ur."roleId" = r.id AND ur."centerId" = 'a0000000-0000-4000-8000-000000000001'
  );

INSERT INTO "UserRole" (id, "userId", "roleId", "centerId", "createdAt")
SELECT gen_random_uuid(), u.id, r.id, 'a0000000-0000-4000-8000-000000000001', NOW()
FROM "User" u
JOIN "Role" r ON r.name = 'student'
WHERE u.email = 'student@educationcenter.com'
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur
    WHERE ur."userId" = u.id AND ur."roleId" = r.id AND ur."centerId" = 'a0000000-0000-4000-8000-000000000001'
  );

-- 7) Student profile linked to student user
INSERT INTO "Student" (
  id, "userId", "centerId", "fullName", "dateOfBirth", gender, phone, email,
  address, "enrollmentDate", status, notes, "createdAt", "updatedAt"
)
VALUES (
  'd0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Nguyen Van Demo',
  '2015-03-15'::date,
  'male'::"Gender",
  '0901234567',
  'student@educationcenter.com',
  '456 Demo Ward, Ho Chi Minh City',
  '2024-09-01'::date,
  'active'::"StudentStatus",
  'Demo student account',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "userId" = EXCLUDED."userId",
  status = 'active'::"StudentStatus",
  "updatedAt" = NOW();
