"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import {
    Search,
    Download,
    Plus,
    Eye,
    Edit,
    MoreHorizontal,
    UserX,
    UserCheck,
    Shield,
    Mail,
    CreditCard,
    AlertTriangle,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { apiClient, logAdminAction, useApiData } from "../../lib";
import { getErrorMessage, getErrorStack } from "../../lib/errors";
import { UserCreationForm } from "./UserCreationForm";
import { UserEditForm } from "./UserEditForm";

interface User {
    id: number;
    name: string;
    email: string;
    kyc: "approved" | "pending" | "rejected";
    plan: "basic" | "premium" | "professional";
    status: "active" | "suspended" | "pending";
    joined: string;
    lastLogin: string;
    mailCount: number;
    totalSpent: string;
    companyName?: string;
    address?: string;
    phone?: string;
}

interface UsersSectionProps {
    onNavigate?: (page: string, data?: any) => void;
}

export function UsersSection({ onNavigate }: UsersSectionProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [planFilter, setPlanFilter] = useState("all");
    const [kycFilter, setKycFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // API Data fetching
    const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useApiData('/api/admin/users');
    const { data: userStats, isLoading: statsLoading } = useApiData('/api/admin/users/stats');

    const userData = users || [];
    const stats = userStats as any;

    const filteredUsers = userData.filter((user: User) => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "all" || user.status === statusFilter;
        const matchesPlan = planFilter === "all" || user.plan === planFilter;
        const matchesKyc = kycFilter === "all" || user.kyc === kycFilter;
        return matchesSearch && matchesStatus && matchesPlan && matchesKyc;
    });

    const handleExportUsers = async () => {
        setLoading(true);
        try {
            await logAdminAction('admin_export_users', {
                filters: { statusFilter, planFilter, kycFilter, searchTerm }
            });

            const response = await apiClient.get(`/api/admin/users/export?status=${statusFilter}&plan=${planFilter}&kyc=${kycFilter}&search=${searchTerm}`);

            const blob = new Blob([response.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (error) {
            await logAdminAction('admin_export_users_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        try {
            await logAdminAction('admin_add_user_initiated');
            setShowCreateForm(true);
        } catch (error) {
            await logAdminAction('admin_add_user_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleUserCreated = async (newUser: any) => {
        try {
            await logAdminAction('admin_user_created_success', {
                userId: newUser.id,
                email: newUser.email
            });
            setShowCreateForm(false);
            refetchUsers(); // Refresh the user list
        } catch (error) {
            await logAdminAction('admin_user_created_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleCancelCreate = () => {
        setShowCreateForm(false);
    };

    const handleViewUser = async (userId: number) => {
        try {
            await logAdminAction('admin_view_user', { userId });
            if (onNavigate) {
                onNavigate('user-detail', { userId });
            } else {
                window.open(`/admin/users/${userId}`, '_blank');
            }
        } catch (error) {
            await logAdminAction('admin_view_user_error', { userId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleEditUser = async (userId: number) => {
        try {
            await logAdminAction('admin_edit_user_initiated', { userId });
            const user = userData.find((u: User) => u.id === userId);
            if (user) {
                setSelectedUser(user);
                setShowEditForm(true);
            }
        } catch (error) {
            await logAdminAction('admin_edit_user_error', { userId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleUserUpdated = async (updatedUser: any) => {
        try {
            await logAdminAction('admin_user_updated_success', {
                userId: updatedUser.id,
                email: updatedUser.email
            });
            setShowEditForm(false);
            setSelectedUser(null);
            refetchUsers(); // Refresh the user list
        } catch (error) {
            await logAdminAction('admin_user_updated_error', { error_message: getErrorMessage(error), stack: getErrorStack(error) });
        }
    };

    const handleCancelEdit = () => {
        setShowEditForm(false);
        setSelectedUser(null);
    };

    const handleUpdateKycStatus = async (userId: number, newStatus: string) => {
        setLoading(true);
        try {
            await logAdminAction('admin_update_kyc_status', { userId, newStatus });
            await apiClient.put(`/api/admin/users/${userId}/kyc-status`, { status: newStatus });
            refetchUsers();
        } catch (error) {
            await logAdminAction('admin_update_kyc_status_error', { userId, newStatus, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleSuspendUser = async (userId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_suspend_user', { userId });
            await apiClient.put(`/api/admin/users/${userId}/suspend`);
            refetchUsers();
        } catch (error) {
            await logAdminAction('admin_suspend_user_error', { userId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleActivateUser = async (userId: number) => {
        setLoading(true);
        try {
            await logAdminAction('admin_activate_user', { userId });
            await apiClient.put(`/api/admin/users/${userId}/activate`);
            refetchUsers();
        } catch (error) {
            await logAdminAction('admin_activate_user_error', { userId, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedUsers.length === 0) return;

        setLoading(true);
        try {
            await logAdminAction('admin_bulk_action', { action, userIds: selectedUsers });
            await apiClient.post(`/api/admin/users/bulk/${action}`, { userIds: selectedUsers });
            setSelectedUsers([]);
            refetchUsers();
        } catch (error) {
            await logAdminAction('admin_bulk_action_error', { action, userIds: selectedUsers, error_message: getErrorMessage(error), stack: getErrorStack(error) });
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: number) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const selectAllUsers = () => {
        setSelectedUsers(filteredUsers.map((user: User) => user.id));
    };

    const clearSelection = () => {
        setSelectedUsers([]);
    };

    return (
        <div className="space-y-6">
            {showCreateForm && (
                <UserCreationForm
                    onSuccess={handleUserCreated}
                    onCancel={handleCancelCreate}
                />
            )}

            {showEditForm && selectedUser && (
                <UserEditForm
                    user={selectedUser}
                    onSuccess={handleUserUpdated}
                    onCancel={handleCancelEdit}
                />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage user accounts, KYC status, and subscriptions</p>
                    {userStats && (
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Total: {stats?.total || 0}</span>
                            <span>Active: {stats?.active || 0}</span>
                            <span>Pending KYC: {stats?.pendingKyc || 0}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportUsers}
                        disabled={loading}
                    >
                        <Download className="h-4 w-4" />
                        Export Users
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={handleAddUser}
                        disabled={loading}
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
                                <Button variant="ghost" size="sm" onClick={clearSelection}>
                                    Clear
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('suspend')}
                                    disabled={loading}
                                >
                                    <UserX className="h-4 w-4" />
                                    Suspend
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('activate')}
                                    disabled={loading}
                                >
                                    <UserCheck className="h-4 w-4" />
                                    Activate
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBulkAction('export')}
                                    disabled={loading}
                                >
                                    <Download className="h-4 w-4" />
                                    Export Selected
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters and Search */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users by name, email, or company..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={planFilter} onValueChange={setPlanFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Plans</SelectItem>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={kycFilter} onValueChange={setKycFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="KYC" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All KYC</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Desktop Table */}
            <div className="hidden lg:block">
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                        onChange={selectedUsers.length === filteredUsers.length ? clearSelection : selectAllUsers}
                                        className="rounded"
                                    />
                                </TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>KYC Status</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mail Count</TableHead>
                                <TableHead>Total Spent</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user: User) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => toggleUserSelection(user.id)}
                                                className="rounded"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                                {user.companyName && (
                                                    <div className="text-xs text-muted-foreground">{user.companyName}</div>
                                                )}
                                                <div className="text-xs text-muted-foreground">Joined {user.joined}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={user.kyc === "approved" ? "default" : user.kyc === "pending" ? "secondary" : "destructive"}>
                                                    {user.kyc}
                                                </Badge>
                                                {user.kyc === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleUpdateKycStatus(user.id, "approved")}
                                                        disabled={loading}
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {user.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={user.status === "active" ? "default" : "destructive"}>
                                                    {user.status}
                                                </Badge>
                                                {user.status === "suspended" ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleActivateUser(user.id)}
                                                        disabled={loading}
                                                    >
                                                        <UserCheck className="h-3 w-3" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSuspendUser(user.id)}
                                                        disabled={loading}
                                                    >
                                                        <UserX className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.mailCount}</TableCell>
                                        <TableCell>{user.totalSpent}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleViewUser(user.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditUser(user.id)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="outline">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
                {filteredUsers.map((user: User) => (
                    <Card key={user.id}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => toggleUserSelection(user.id)}
                                        className="rounded mt-1"
                                    />
                                    <div>
                                        <h3 className="font-medium">{user.name}</h3>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                        {user.companyName && (
                                            <p className="text-xs text-muted-foreground">{user.companyName}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">Joined {user.joined}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant={user.kyc === "approved" ? "default" : "secondary"} className="mb-1">
                                        {user.kyc}
                                    </Badge>
                                    <br />
                                    <Badge variant={user.status === "active" ? "default" : "destructive"}>
                                        {user.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                <div>
                                    <span className="text-muted-foreground">Plan:</span> <span className="capitalize">{user.plan}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Mail:</span> {user.mailCount}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Spent:</span> {user.totalSpent}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Login:</span> {user.lastLogin}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleViewUser(user.id)}
                                >
                                    View
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleEditUser(user.id)}
                                >
                                    Edit
                                </Button>
                                <Button size="sm" variant="outline" className="flex-1">
                                    Actions
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
