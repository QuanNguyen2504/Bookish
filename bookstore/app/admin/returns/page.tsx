'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  returnApi, ReturnRequestResponse, ReturnStatus,
  REASON_LABELS, STATUS_LABELS,
} from '@/lib/api/return-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Eye, Loader2, CheckCircle2, XCircle, Package, Banknote, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

const fmt = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

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

const STATUS_COLOR: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-purple-100 text-purple-700',
  REFUNDED: 'bg-emerald-100 text-emerald-700',
  CANCELLED_BY_USER: 'bg-gray-100 text-gray-700',
};

function StatCard({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className={cn('rounded-xl p-4 text-center', className)}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

export default function AdminReturnsPage() {
  const token = useAuthStore((state) => state.token);
  const [requests, setRequests] = useState<ReturnRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ReturnRequestResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await returnApi.adminGetAll(token);
      setRequests(data);
      setSelected(prev => prev ? (data.find(r => r.returnId === prev.returnId) ?? null) : null);
    } catch {
      toast.error('Không thể tải danh sách yêu cầu hoàn trả');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (
    action: 'approve' | 'reject' | 'mark-returned' | 'mark-refunded',
  ) => {
    if (!selected || !token) return;
    setUpdating(true);
    try {
      let updated: ReturnRequestResponse;
      if (action === 'approve') {
        updated = await returnApi.adminApprove(selected.returnId, adminNote, token);
        toast.success('Đã duyệt yêu cầu');
      } else if (action === 'reject') {
        if (!adminNote.trim()) {
          toast.error('Vui lòng nhập lý do từ chối');
          setUpdating(false);
          return;
        }
        updated = await returnApi.adminReject(selected.returnId, adminNote, token);
        toast.success('Đã từ chối yêu cầu');
      } else if (action === 'mark-returned') {
        updated = await returnApi.adminMarkReturned(selected.returnId, token);
        toast.success('Đã xác nhận nhận hàng — kho đã được hoàn');
      } else {
        updated = await returnApi.adminMarkRefunded(selected.returnId, adminNote, token);
        toast.success('Đã xác nhận hoàn tiền');
      }
      setRequests(prev => prev.map(r => r.returnId === updated.returnId ? updated : r));
      setSelected(updated);
      setAdminNote('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = useMemo(() => requests.filter(r => {
    const matchSearch =
      String(r.orderId).includes(searchTerm) ||
      String(r.returnId).includes(searchTerm) ||
      r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  }), [requests, searchTerm, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedRequests = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: requests.length,
    requested: requests.filter(r => r.status === 'REQUESTED').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    returned: requests.filter(r => r.status === 'RETURNED').length,
    refunded: requests.filter(r => r.status === 'REFUNDED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Yêu cầu hoàn trả</h1>
        <p className="text-muted-foreground text-sm">
          Xét duyệt yêu cầu hoàn trả của khách hàng
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Tổng yêu cầu" count={stats.total} className="bg-slate-100 text-slate-700" />
        <StatCard label="Chờ duyệt" count={stats.requested} className="bg-amber-100 text-amber-700" />
        <StatCard label="Đã duyệt" count={stats.approved} className="bg-blue-100 text-blue-700" />
        <StatCard label="Đã nhận hàng" count={stats.returned} className="bg-purple-100 text-purple-700" />
        <StatCard label="Đã hoàn tiền" count={stats.refunded} className="bg-emerald-100 text-emerald-700" />
        <StatCard label="Đã từ chối" count={stats.rejected} className="bg-red-100 text-red-700" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">
            Danh sách yêu cầu ({filtered.length})
            {totalPages > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — Trang {currentPage}/{totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm theo mã đơn, mã yêu cầu, username, email..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="REQUESTED">Chờ duyệt</SelectItem>
                <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                <SelectItem value="RETURNED">Đã nhận hàng</SelectItem>
                <SelectItem value="REFUNDED">Đã hoàn tiền</SelectItem>
                <SelectItem value="REJECTED">Đã từ chối</SelectItem>
                <SelectItem value="CANCELLED_BY_USER">User đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Không có yêu cầu nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã YC</TableHead>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Số tiền hoàn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.map(r => (
                    <TableRow key={r.returnId}>
                      <TableCell className="font-medium">#{String(r.returnId).padStart(4, '0')}</TableCell>
                      <TableCell>#{String(r.orderId).padStart(6, '0')}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.username}</div>
                        <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm">{REASON_LABELS[r.reason]}</TableCell>
                      <TableCell className="font-medium text-primary">{fmt(r.refundAmount)}</TableCell>
                      <TableCell>
                        <span className={cn('inline-block px-2 py-1 rounded-full text-xs font-medium',
                          STATUS_COLOR[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDate(r.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="icon"
                          onClick={() => { setSelected(r); setAdminNote(r.adminNote || ''); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setAdminNote(''); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Yêu cầu hoàn trả #{selected && String(selected.returnId).padStart(4, '0')}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              <div className={cn('rounded-xl p-3 text-sm font-medium', STATUS_COLOR[selected.status])}>
                {STATUS_LABELS[selected.status]}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Thông tin đơn hàng gốc</h3>
                <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã đơn</span>
                    <span className="font-medium">#{String(selected.orderId).padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng tiền</span>
                    <span className="font-medium">{fmt(selected.orderTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thanh toán</span>
                    <span>{selected.orderPaymentMethod === 'QR_CODE' ? 'QR Code' : 'Tiền mặt (COD)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày đặt</span>
                    <span>{fmtDate(selected.orderDeliveredAt)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Lý do hoàn trả</h3>
                <div className="rounded-xl border border-border p-4 space-y-2">
                  <p className="font-medium">{REASON_LABELS[selected.reason]}</p>
                  {selected.description && (
                    <p className="text-sm text-muted-foreground">{selected.description}</p>
                  )}
                  {selected.imageUrl && (
                    <div className="relative h-48 w-full rounded-lg overflow-hidden mt-2">
                      <Image src={selected.imageUrl} alt="Ảnh minh chứng" fill className="object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Số tiền sẽ hoàn</span>
                  <span className="text-xl font-bold text-primary">{fmt(selected.refundAmount)}</span>
                </div>
                {selected.reason === 'CHANGE_MIND' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    * Đã trừ phí ship do lý do "đổi ý"
                  </p>
                )}
              </div>

              {(selected.status === 'APPROVED' || selected.status === 'RETURNED' || selected.status === 'REFUNDED') && (
                <div>
                  <h3 className="font-semibold mb-2">Thông tin ngân hàng</h3>
                  <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                    {selected.bankAccount ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ngân hàng</span>
                          <span className="font-medium">{selected.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Số tài khoản</span>
                          <span className="font-mono font-medium">{selected.bankAccount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Chủ tài khoản</span>
                          <span className="font-medium">{selected.accountHolder}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-amber-700">
                        User chưa cung cấp thông tin ngân hàng
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(selected.status === 'REQUESTED' || selected.status === 'RETURNED' || selected.status === 'REJECTED') && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ghi chú của admin {selected.status === 'REQUESTED' && '(bắt buộc khi từ chối)'}
                  </label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Nhập ghi chú..."
                    rows={3}
                    disabled={selected.status === 'REJECTED'}
                  />
                  {selected.adminNote && selected.status === 'REJECTED' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Lý do từ chối đã lưu: {selected.adminNote}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons theo status */}
              <div className="flex gap-2">
                {selected.status === 'REQUESTED' && (
                  <>
                    <Button className="flex-1 gap-2" onClick={() => handleAction('approve')} disabled={updating}>
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Duyệt yêu cầu
                    </Button>
                    <Button variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-white gap-2"
                      onClick={() => handleAction('reject')} disabled={updating}>
                      <XCircle className="h-4 w-4" />
                      Từ chối
                    </Button>
                  </>
                )}
                {selected.status === 'APPROVED' && (
                  <Button className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleAction('mark-returned')} disabled={updating}>
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    Xác nhận đã nhận hàng (sẽ hoàn kho)
                  </Button>
                )}
                {selected.status === 'RETURNED' && (
                  <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAction('mark-refunded')} disabled={updating || !selected.bankAccount}>
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                    {selected.bankAccount ? 'Xác nhận đã chuyển tiền' : 'Chờ user cung cấp STK'}
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Tạo lúc: {fmtDate(selected.createdAt)}
                {selected.updatedAt && ` · Cập nhật: ${fmtDate(selected.updatedAt)}`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}