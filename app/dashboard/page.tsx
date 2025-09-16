import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardPage as DashboardPageComponent } from '@/components/dashboard/DashboardPage';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardPageComponent />
    </DashboardLayout>
  );
}