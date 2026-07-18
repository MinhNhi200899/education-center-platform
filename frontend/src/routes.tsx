import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Layout
import { AppLayout } from '@/features/layout/AppLayout';

// Auth pages
import { LoginPage } from '@/features/auth/pages/LoginPage';

// Dashboard
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';

// Students
import { StudentListPage } from '@/features/students/pages/StudentListPage';
import { StudentDetailPage } from '@/features/students/pages/StudentDetailPage';
import { StudentFormPage } from '@/features/students/pages/StudentFormPage';

// Teachers
import { TeacherListPage } from '@/features/teachers/pages/TeacherListPage';
import { TeacherDetailPage } from '@/features/teachers/pages/TeacherDetailPage';
import { TeacherFormPage } from '@/features/teachers/pages/TeacherFormPage';

// Classes
import { ClassListPage } from '@/features/classes/pages/ClassListPage';
import { ClassDetailPage } from '@/features/classes/pages/ClassDetailPage';
import { ClassFormPage } from '@/features/classes/pages/ClassFormPage';

// Attendance
import { AttendanceHubPage } from '@/features/attendance/pages/AttendanceHubPage';
import { AttendancePage } from '@/features/attendance/pages/AttendancePage';
import { AttendanceMonthlyPage } from '@/features/attendance/pages/AttendanceMonthlyPage';
import { AttendanceListPage } from '@/features/attendance/pages/AttendanceListPage';

// Evaluations (hidden via FEATURE_EVALUATIONS_UI)
import { EvaluationListPage } from '@/features/evaluations/pages/EvaluationListPage';
import { EvaluationFormPage } from '@/features/evaluations/pages/EvaluationFormPage';
import { FEATURE_EVALUATIONS_UI } from '@/lib/feature-flags';

// Payments
import { PaymentsIndexPage } from '@/features/payments/pages/PaymentsIndexPage';
import { PaymentPage } from '@/features/payments/pages/PaymentPage';

// Reports
import { ReportsPage } from '@/features/reports/pages/ReportsPage';

// Schedule
import { SchedulePage } from '@/features/schedule/pages/SchedulePage';

// Settings
import { PaymentSettingsPage, RolesPage } from '@/features/settings';

// Student portal
import {
  StudentHomePage,
  StudentSchedulePage,
  StudentTuitionPage,
  StudentInvoiceDetailPage,
  StudentHomeworkPage,
} from '@/features/portal';

// Teacher portal
import {
  TeacherHomePage,
  TeacherSchedulePage,
  TeacherClassesPage,
} from '@/features/teacher-portal';

import { isStudentUser, isTeacherUser, isAdminUser, getHomePath } from '@/lib/roles';

// Protected route wrapper
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Role-based access check
function RoleRoute({ roles }: { roles: string[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const hasRole = user.roles.some((role) => roles.includes(role));
  if (!hasRole) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  return <Outlet />;
}

function StudentOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isStudentUser(user)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function TeacherOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isTeacherUser(user)) return <Navigate to={getHomePath(user)} replace />;
  return <Outlet />;
}

function AdminOnlyRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isStudentUser(user)) return <Navigate to="/portal" replace />;
  // Teachers are allowed through; per-route RoleRoute below gates which
  // admin pages a teacher can actually see (e.g. /attendance, /evaluations,
  // /payments). isAdminUser still blocks any other non-admin role.
  if (!isAdminUser(user) && !isTeacherUser(user)) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return <Outlet />;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user)} replace />;
}

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Home redirect
          {
            index: true,
            element: <HomeRedirect />,
          },

          // Student portal
          {
            path: 'portal',
            element: <StudentOnlyRoute />,
            children: [
              { index: true, element: <StudentHomePage /> },
              { path: 'schedule', element: <StudentSchedulePage /> },
              { path: 'homework', element: <StudentHomeworkPage /> },
              { path: 'tuition', element: <StudentTuitionPage /> },
              { path: 'tuition/:id', element: <StudentInvoiceDetailPage /> },
            ],
          },

          // Teacher portal
          {
            path: 'teacher',
            element: <TeacherOnlyRoute />,
            children: [
              { index: true, element: <TeacherHomePage /> },
              { path: 'schedule', element: <TeacherSchedulePage /> },
              { path: 'classes', element: <TeacherClassesPage /> },
            ],
          },

          // Admin dashboard
          {
            element: <AdminOnlyRoute />,
            children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },

          // Students
          {
            path: 'students',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [
              { index: true, element: <StudentListPage /> },
              { path: 'new', element: <StudentFormPage /> },
              { path: ':id', element: <StudentDetailPage /> },
              { path: ':id/edit', element: <StudentFormPage /> },
            ],
          },

          // Teachers
          {
            path: 'teachers',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [
              { index: true, element: <TeacherListPage /> },
              { path: 'new', element: <TeacherFormPage /> },
              { path: ':id', element: <TeacherDetailPage /> },
              { path: ':id/edit', element: <TeacherFormPage /> },
            ],
          },

          // Classes
          {
            path: 'classes',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [
              { index: true, element: <ClassListPage /> },
              { path: 'new', element: <ClassFormPage /> },
              { path: ':id', element: <ClassDetailPage /> },
              { path: ':id/edit', element: <ClassFormPage /> },
            ],
          },

          // Schedule (Lịch dạy)
          {
            path: 'schedule',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [{ index: true, element: <SchedulePage /> }],
          },

          // Attendance
          {
            path: 'attendance',
            element: (
              <RoleRoute roles={['super_admin', 'teacher']} />
            ),
            children: [
              { index: true, element: <AttendanceHubPage /> },
              { path: 'history', element: <AttendanceListPage /> },
              { path: 'mark/:sessionId', element: <AttendancePage /> },
              { path: 'monthly/:classId', element: <AttendanceMonthlyPage /> },
            ],
          },

          // Evaluations (disabled when FEATURE_EVALUATIONS_UI is false)
          ...(FEATURE_EVALUATIONS_UI
            ? [
                {
                  path: 'evaluations',
                  element: <RoleRoute roles={['super_admin', 'teacher']} />,
                  children: [
                    { index: true, element: <EvaluationListPage /> },
                    { path: 'new', element: <EvaluationFormPage /> },
                    { path: ':id', element: <EvaluationFormPage /> },
                  ],
                },
              ]
            : [{ path: 'evaluations/*', element: <HomeRedirect /> }]),

          // Payments & Tuition
          {
            path: 'payments',
            element: (
              <RoleRoute roles={['super_admin', 'parent', 'teacher']} />
            ),
            children: [
              { index: true, element: <PaymentsIndexPage /> },
              { path: 'invoice/:id', element: <PaymentPage /> },
            ],
          },

          // Reports
          {
            path: 'reports',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [
              { index: true, element: <ReportsPage /> },
            ],
          },

          // Settings
          {
            path: 'settings',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager']} />
            ),
            children: [
              { path: 'payments', element: <PaymentSettingsPage /> },
              { path: 'roles', element: <RolesPage /> },
            ],
          },
            ],
          },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);