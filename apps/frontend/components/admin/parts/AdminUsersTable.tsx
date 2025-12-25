"use client";

import dynamic from "next/dynamic";

const UsersSection = dynamic(() => import("@/components/admin/UsersSection"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>
  ),
});

interface AdminUsersTableProps {
  users: any[];
  loading: boolean;
  error: string | null;
  onFiltersChange: (filters: { search: string; status: string; plan_id: string; kyc_status: string }) => void;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isValidating: boolean;
  onRefreshUsers: () => void;
}

export function AdminUsersTable(props: AdminUsersTableProps) {
  return <UsersSection {...props} />;
}


