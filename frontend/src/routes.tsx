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

// Evaluations
import { EvaluationListPage } from '@/features/evaluations/pages/EvaluationListPage';
import { EvaluationFormPage } from '@/features/evaluations/pages/EvaluationFormPage';

// Payments
import { InvoiceListPage } from '@/features/payments/pages/InvoiceListPage';
import { PaymentPage } from '@/features/payments/pages/PaymentPage';

// Reports
import { ReportsPage } from '@/features/reports/pages/ReportsPage';

// Schedule
import { SchedulePage } from '@/features/schedule/pages/SchedulePage';

// Settings
import { PaymentSettingsPage, RolesPage } from '@/features/settings';

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
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
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
          // Dashboard
          { index: true, element: <DashboardPage /> },
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
              <RoleRoute roles={['super_admin', 'center_manager', 'teacher']} />
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
              <RoleRoute roles={['super_admin', 'center_manager', 'teacher']} />
            ),
            children: [{ index: true, element: <SchedulePage /> }],
          },

          // Attendance
          {
            path: 'attendance',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager', 'teacher']} />
            ),
            children: [
              { index: true, element: <AttendanceHubPage /> },
              { path: 'history', element: <AttendanceListPage /> },
              { path: 'mark/:sessionId', element: <AttendancePage /> },
              { path: 'monthly/:classId', element: <AttendanceMonthlyPage /> },
            ],
          },

          // Evaluations
          {
            path: 'evaluations',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager', 'teacher']} />
            ),
            children: [
              { index: true, element: <EvaluationListPage /> },
              { path: 'new', element: <EvaluationFormPage /> },
              { path: ':id', element: <EvaluationFormPage /> },
            ],
          },

          // Payments & Tuition
          {
            path: 'payments',
            element: (
              <RoleRoute roles={['super_admin', 'center_manager', 'parent']} />
            ),
            children: [
              { index: true, element: <InvoiceListPage /> },
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

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);