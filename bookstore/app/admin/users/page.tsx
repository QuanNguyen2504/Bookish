'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { customerApi, CustomerResponse } from '@/lib/api/customer-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Eye, Trash2, Users, UserIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function PaginationBar({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}
            className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
        {getPageNumbers(currentPage, totalPages).map((page, i) => (
          <PaginationItem key={i}>
            {page === '...' ? <PaginationEllipsis /> : (
              <PaginationLink href="#" isActive={page === currentPage}
                onClick={(e) => { e.preventDefault(); onPageChange(page as number); }}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) onPageChange(currentPage + 1); }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export default function AdminUsersPage() {
  const { token } = useAuthStore();

  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<CustomerResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Lấy danh sách customers từ API
  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const data = await customerApi.getAll(token);
      setCustomers(data);
    } catch (error) {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleViewDetail = (user: CustomerResponse) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
  };

  const handleDeleteConfirm = async () => {
  if (!selectedUser || !token) return;
  try {
    setIsDeleting(true);
    await customerApi.delete(selectedUser.id, token);
    setCustomers(prev => prev.filter(u => u.id !== selectedUser.id));
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
    toast.success(`Đã xóa tài khoản "${selectedUser.username}"`);
  } catch (error) {
    //  Hiện đúng message lỗi từ backend
    toast.error(error instanceof Error ? error.message : 'Không thể xóa tài khoản');
  } finally {
    setIsDeleting(false);
  }
};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý Người dùng</h1>
        <p className="text-muted-foreground">Xem và quản lý tài khoản người dùng</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{customers.length}</p>
              <p className="text-sm text-muted-foreground">Tổng người dùng</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-emerald-100 p-3">
              <UserIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {customers.filter(u => u.role === 'USER').length}
              </p>
              <p className="text-sm text-muted-foreground">Khách hàng</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-purple-100 p-3">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {customers.filter(u => u.role === 'ADMIN').length}
              </p>
              <p className="text-sm text-muted-foreground">Quản trị viên</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo username, email, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách người dùng ({filteredCustomers.length})
            {totalPages > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — Trang {currentPage}/{totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        Không có người dùng nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCustomers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {user.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.phone || 'Chưa có SĐT'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {user.address || 'Chưa cập nhật'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'STAFF' ? 'outline' : 'secondary'}>
                            {user.role === 'ADMIN' ? 'Admin' : user.role === 'STAFF' ? 'Nhân viên' : 'Người dùng'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleViewDetail(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.role === 'USER' && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Thông tin người dùng</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatarUrl ?? undefined} alt={selectedUser.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.username}</h3>
                  <Badge variant={selectedUser.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {selectedUser.role === 'ADMIN' ? 'Quản trị viên' : selectedUser.role === 'STAFF' ? 'Nhân viên' : 'Người dùng'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Email', value: selectedUser.email },
                  { label: 'Số điện thoại', value: selectedUser.phone || 'Chưa cập nhật' },
                  { label: 'Địa chỉ', value: selectedUser.address || 'Chưa cập nhật' },
                  { label: 'Ngày tạo', value: formatDate(selectedUser.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản của &quot;{selectedUser?.username}&quot;?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xóa...</>
              ) : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}