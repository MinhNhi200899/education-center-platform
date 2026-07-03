import { useAuth } from '@/contexts/AuthContext';
import { isTeacherUser } from '@/lib/roles';
import { TeacherPaymentSettingsPage } from '@/features/teacher-portal/pages/TeacherPaymentSettingsPage';
import { InvoiceListPage } from './InvoiceListPage';

export function PaymentsIndexPage() {
  const { user } = useAuth();
  if (isTeacherUser(user)) {
    return <TeacherPaymentSettingsPage />;
  }
  return <InvoiceListPage />;
}
