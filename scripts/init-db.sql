-- ============================================================
-- Database Initialization Script
-- Education Center Platform
-- Run on first container startup
-- ============================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- System Roles
-- ============================================================

INSERT INTO "Role" (id, name, description, "isSystem", "isActive", "createdAt", "updatedAt")
VALUES
    (uuid_generate_v4(), 'super_admin', 'Platform-wide administrator with full access', true, true, NOW(), NOW()),
    (uuid_generate_v4(), 'center_manager', 'Manages a single education center', true, true, NOW(), NOW()),
    (uuid_generate_v4(), 'teacher', 'Class teacher with teaching-focused access', true, true, NOW(), NOW()),
    (uuid_generate_v4(), 'parent', 'Parent/guardian with child-view access', true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Permissions
-- ============================================================

INSERT INTO "Permission" (id, name, module, level, description, "createdAt")
VALUES
    -- Centers
    (uuid_generate_v4(), 'centers.read', 'centers', 1, 'View centers', NOW()),
    (uuid_generate_v4(), 'centers.create', 'centers', 2, 'Create centers', NOW()),
    (uuid_generate_v4(), 'centers.update', 'centers', 3, 'Update centers', NOW()),
    (uuid_generate_v4(), 'centers.delete', 'centers', 4, 'Delete centers', NOW()),

    -- Students
    (uuid_generate_v4(), 'students.read', 'students', 1, 'View student records', NOW()),
    (uuid_generate_v4(), 'students.create', 'students', 2, 'Create student records', NOW()),
    (uuid_generate_v4(), 'students.update', 'students', 3, 'Update student records', NOW()),
    (uuid_generate_v4(), 'students.delete', 'students', 4, 'Delete/archive student records', NOW()),
    (uuid_generate_v4(), 'students.export', 'students', 5, 'Export student data', NOW()),

    -- Teachers
    (uuid_generate_v4(), 'teachers.read', 'teachers', 1, 'View teacher records', NOW()),
    (uuid_generate_v4(), 'teachers.create', 'teachers', 2, 'Create teacher records', NOW()),
    (uuid_generate_v4(), 'teachers.update', 'teachers', 3, 'Update teacher records', NOW()),
    (uuid_generate_v4(), 'teachers.delete', 'teachers', 4, 'Archive teacher records', NOW()),
    (uuid_generate_v4(), 'teachers.export', 'teachers', 5, 'Export teacher data', NOW()),

    -- Classes
    (uuid_generate_v4(), 'classes.read', 'classes', 1, 'View class information', NOW()),
    (uuid_generate_v4(), 'classes.create', 'classes', 2, 'Create classes', NOW()),
    (uuid_generate_v4(), 'classes.update', 'classes', 3, 'Update class information', NOW()),
    (uuid_generate_v4(), 'classes.delete', 'classes', 4, 'Archive classes', NOW()),

    -- Attendance
    (uuid_generate_v4(), 'attendance.read', 'attendance', 1, 'View attendance records', NOW()),
    (uuid_generate_v4(), 'attendance.create', 'attendance', 2, 'Mark attendance', NOW()),
    (uuid_generate_v4(), 'attendance.update', 'attendance', 3, 'Update attendance', NOW()),

    -- Schedule
    (uuid_generate_v4(), 'schedule.read', 'schedule', 1, 'View schedules', NOW()),
    (uuid_generate_v4(), 'schedule.create', 'schedule', 2, 'Create sessions', NOW()),
    (uuid_generate_v4(), 'schedule.update', 'schedule', 3, 'Update sessions', NOW()),

    -- Evaluations
    (uuid_generate_v4(), 'evaluations.read', 'evaluations', 1, 'View evaluations', NOW()),
    (uuid_generate_v4(), 'evaluations.create', 'evaluations', 2, 'Create evaluations', NOW()),
    (uuid_generate_v4(), 'evaluations.update', 'evaluations', 3, 'Update evaluations', NOW()),

    -- Tuition
    (uuid_generate_v4(), 'tuition.read', 'tuition', 1, 'View tuition plans', NOW()),
    (uuid_generate_v4(), 'tuition.create', 'tuition', 2, 'Create tuition plans', NOW()),
    (uuid_generate_v4(), 'tuition.update', 'tuition', 3, 'Update tuition plans', NOW()),

    -- Payments
    (uuid_generate_v4(), 'payments.read', 'payments', 1, 'View payment records', NOW()),
    (uuid_generate_v4(), 'payments.create', 'payments', 2, 'Create payments', NOW()),

    -- Dashboard
    (uuid_generate_v4(), 'dashboard.read', 'dashboard', 1, 'View dashboard', NOW()),
    (uuid_generate_v4(), 'dashboard.export', 'dashboard', 5, 'Export dashboard data', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- System Absence Reasons
-- ============================================================

INSERT INTO "AbsenceReason" (id, name, description, "displayOrder", "isSystem", "isActive", "createdAt")
VALUES
    (uuid_generate_v4(), 'Sick', 'Student illness', 1, true, true, NOW()),
    (uuid_generate_v4(), 'Family Emergency', 'Family urgent matter', 2, true, true, NOW()),
    (uuid_generate_v4(), 'Religious Observance', 'Religious holiday or observance', 3, true, true, NOW()),
    (uuid_generate_v4(), 'School/Event Conflict', 'Other school or event conflict', 4, true, true, NOW()),
    (uuid_generate_v4(), 'Transportation Issue', 'Transportation problems', 5, true, true, NOW()),
    (uuid_generate_v4(), 'Weather Condition', 'Bad weather conditions', 6, true, true, NOW()),
    (uuid_generate_v4(), 'Other', 'Other reason (description required)', 7, true, true, NOW())
ON CONFLICT DO NOTHING;

-- ============================================================
-- Demo Center (for development)
-- ============================================================

DO $$
DECLARE
    center_id UUID;
    admin_user_id UUID;
    center_manager_role_id UUID;
    all_perms_id UUID;
BEGIN
    -- Check if demo center already exists
    SELECT id INTO center_id FROM "Center" WHERE code = 'DEMO01';

    IF center_id IS NULL THEN
        -- Create demo center
        INSERT INTO "Center" (id, name, code, address, phone, email, timezone, status, "createdAt", "updatedAt")
        VALUES (
            uuid_generate_v4(),
            'Demo Education Center',
            'DEMO01',
            '123 Demo Street, Ho Chi Minh City',
            '+84 28 1234 5678',
            'demo@educationcenter.com',
            'Asia/Ho_Chi_Minh',
            'active',
            NOW(),
            NOW()
        )
        RETURNING id INTO center_id;

        -- Create admin user (password: admin123)
        INSERT INTO "User" (id, centerId, email, "passwordHash", phone, status, "failedLoginCount", "createdAt", "updatedAt")
        VALUES (
            uuid_generate_v4(),
            center_id,
            'admin@educationcenter.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYaT.8g3C0Oq', -- bcrypt hash of 'admin123'
            '+84 28 9876 5432',
            'active',
            0,
            NOW(),
            NOW()
        )
        RETURNING id INTO admin_user_id;

        -- Get center_manager role id
        SELECT id INTO center_manager_role_id FROM "Role" WHERE name = 'center_manager';

        -- Assign center_manager role to admin
        INSERT INTO "UserRole" (id, "userId", "roleId", "centerId", "createdAt")
        VALUES (uuid_generate_v4(), admin_user_id, center_manager_role_id, center_id, NOW());

        RAISE NOTICE 'Demo center created successfully!';
        RAISE NOTICE 'Admin email: admin@educationcenter.com';
        RAISE NOTICE 'Admin password: admin123';
    ELSE
        RAISE NOTICE 'Demo center already exists, skipping...';
    END IF;
END $$;

-- ============================================================
-- Create indexes for performance (if not exists)
-- ============================================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_students_center_status ON "Student"("centerId", "status");
CREATE INDEX IF NOT EXISTS idx_classes_center_status ON "Class"("centerId", "status");
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON "Invoice"("status", "dueDate");
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON "Enrollment"("studentId", "classId");

-- ============================================================
-- Grant permissions
-- ============================================================

GRANT CONNECT ON DATABASE ecmp_db TO ecmp_user;
GRANT USAGE ON SCHEMA public TO ecmp_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ecmp_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ecmp_user;

-- ============================================================
-- Final message
-- ============================================================

RAISE NOTICE 'Database initialization complete!';
RAISE NOTICE 'You can now run: docker compose up -d';
RAISE NOTICE 'API will be available at: http://localhost:3000';
RAISE NOTICE 'Health check: http://localhost:3000/health';