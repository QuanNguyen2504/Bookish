'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { promotionApi, PromotionResponse, PromotionRequest, DiscountType } from '@/lib/api/promotion-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, CheckCircle2, XCircle, Clock, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── helpers ────────────────────────────────────────────────────────────────

const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  PERCENT: 'Giảm %',
  FIXED: 'Giảm tiền',
  FREESHIP: 'Miễn ship',
};

const formatDiscount = (type: DiscountType, value: number) => {
  if (type === 'PERCENT') return `${value}%`;
  if (type === 'FIXED')
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(value);
  return 'Miễn phí vận chuyển';
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

// ─── types ───────────────────────────────────────────────────────────────────

interface PromotionFormData {
  code: string;
  discountType: DiscountType;
  discountValue: number | '';
  startDate: string;
  durationDays: number | '';
  status: boolean;
  usageLimit: number | '';
  // 🔥 MỚI
  minOrderValue: number | '';
  maxDiscount: number | '';
}

const initialFormData: PromotionFormData = {
  code: '',
  discountType: 'PERCENT',
  discountValue: '',
  startDate: '',
  durationDays: '',
  status: true,
  usageLimit: '',
  minOrderValue: '',
  maxDiscount: '',
};

// ─── component ───────────────────────────────────────────────────────────────

export default function AdminPromotionsPage() {
  const { token } = useAuthStore();

  const [promotions, setPromotions] = useState<PromotionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DiscountType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionResponse | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${API_BASE_URL}/promotions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setPromotions(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải danh sách khuyến mãi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── filter ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return promotions.filter(p => {
      const matchSearch = p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || p.discountType === typeFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.status) ||
        (statusFilter === 'inactive' && !p.status);
      return matchSearch && matchType && matchStatus;
    });
  }, [promotions, searchTerm, typeFilter, statusFilter]);

  // ── dialog ─────────────────────────────────────────────────────────────────

  const handleOpenDialog = (promo?: PromotionResponse) => {
    if (promo) {
      setSelectedPromotion(promo);
      setFormData({
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        startDate: promo.startDate ? promo.startDate.split('T')[0] : '',
        durationDays: promo.durationDays,
        status: promo.status,
        usageLimit: promo.usageLimit,
        minOrderValue: promo.minOrderValue ?? '',
        maxDiscount: promo.maxDiscount ?? '',
      });
    } else {
      setSelectedPromotion(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  // ── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!token) { toast.error('Bạn chưa đăng nhập!'); return; }
    if (!formData.code.trim()) { toast.error('Vui lòng nhập mã khuyến mãi!'); return; }
    if (formData.discountType !== 'FREESHIP' && (formData.discountValue === '' || Number(formData.discountValue) < 0)) {
      toast.error('Vui lòng nhập giá trị giảm hợp lệ!'); return;
    }
    if (!formData.durationDays || Number(formData.durationDays) <= 0) {
      toast.error('Số ngày hiệu lực phải lớn hơn 0!'); return;
    }
    if (!formData.usageLimit || Number(formData.usageLimit) <= 0) {
      toast.error('Giới hạn sử dụng phải lớn hơn 0!'); return;
    }

    const body: PromotionRequest = {
      code: formData.code.trim().toUpperCase(),
      discountType: formData.discountType,
      discountValue: formData.discountType === 'FREESHIP' ? 0 : Number(formData.discountValue),
      startDate: formData.startDate ? `${formData.startDate}T00:00:00` : null,
      durationDays: Number(formData.durationDays),
      status: formData.status,
      usageLimit: Number(formData.usageLimit),
      minOrderValue: formData.minOrderValue === '' ? 0 : Number(formData.minOrderValue),
      maxDiscount: formData.maxDiscount === '' ? undefined : Number(formData.maxDiscount),
    };

    setIsSaving(true);
    try {
      if (selectedPromotion) {
        await promotionApi.update(selectedPromotion.promotion_id, body, token);
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        await promotionApi.create(body, token);
        toast.success('Tạo mã khuyến mãi thành công!');
      }
      setIsDialogOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsSaving(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedPromotion || !token) return;
    try {
      await promotionApi.delete(selectedPromotion.promotion_id, token);
      toast.success('Đã xóa mã khuyến mãi!');
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại');
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedPromotion(null);
    }
  };

  // ── status badge ───────────────────────────────────────────────────────────

  const StatusBadge = ({ promo }: { promo: PromotionResponse }) => {
    const now = new Date();
    const expired = new Date(promo.endTime) < now;
    const exhausted = promo.usedCount >= promo.usageLimit;

    if (!promo.status)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
          <XCircle className="h-3 w-3" /> Vô hiệu
        </span>
      );
    if (expired)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
          <Clock className="h-3 w-3" /> Hết hạn
        </span>
      );
    if (exhausted)
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
          <XCircle className="h-3 w-3" /> Hết lượt
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Đang hoạt động
      </span>
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Khuyến mãi</h1>
          <p className="text-muted-foreground">Tạo và quản lý mã giảm giá cho cửa hàng</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm mã mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mã khuyến mãi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-full md:w-44">
                <Tag className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Loại giảm giá" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="PERCENT">Giảm %</SelectItem>
                <SelectItem value="FIXED">Giảm tiền</SelectItem>
                <SelectItem value="FREESHIP">Miễn ship</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="inactive">Vô hiệu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách mã khuyến mãi ({filtered.length})
            {isLoading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">Đang tải...</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                  <TableHead className="text-right">Đơn tối thiểu</TableHead>
                  <TableHead>Hiệu lực</TableHead>
                  <TableHead className="text-center">Lượt dùng</TableHead>
                  <TableHead className="text-center">Còn lại</TableHead>
                  <TableHead className="text-center">Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((promo) => (
                  <TableRow key={promo.promotion_id}>
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold tracking-wide text-foreground">
                        {promo.code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {DISCOUNT_TYPE_LABEL[promo.discountType]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatDiscount(promo.discountType, promo.discountValue)}
                      {promo.discountType === 'PERCENT' && promo.maxDiscount && promo.maxDiscount > 0 && (
                        <p className="text-xs text-muted-foreground font-normal">
                          Tối đa {formatMoney(promo.maxDiscount)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {promo.minOrderValue && promo.minOrderValue > 0
                        ? formatMoney(promo.minOrderValue)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-foreground">{formatDate(promo.startDate)}</p>
                        <p className="text-muted-foreground">→ {formatDate(promo.endTime)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'text-sm font-medium',
                        promo.usedCount >= promo.usageLimit ? 'text-red-600' : 'text-foreground'
                      )}>
                        {promo.usedCount}/{promo.usageLimit}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'text-sm font-medium',
                        promo.remainingDays <= 0 ? 'text-red-600' :
                        promo.remainingDays <= 3 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {promo.remainingDays <= 0 ? 'Hết hạn' : `${promo.remainingDays} ngày`}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge promo={promo} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(promo)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="icon"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => { setSelectedPromotion(promo); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      Không có mã khuyến mãi nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedPromotion ? 'Chỉnh sửa mã khuyến mãi' : 'Thêm mã khuyến mãi mới'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">

            {/* Mã khuyến mãi */}
            <div className="grid gap-2">
              <Label>Mã khuyến mãi *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="VD: SUMMER20"
                className="font-mono uppercase tracking-wide"
              />
            </div>

            {/* Loại + Giá trị */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Loại giảm giá *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, discountType: v as DiscountType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Giảm %</SelectItem>
                    <SelectItem value="FIXED">Giảm tiền (VND)</SelectItem>
                    <SelectItem value="FREESHIP">Miễn phí ship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>
                  Giá trị{formData.discountType !== 'FREESHIP' && ' *'}{' '}
                  <span className="text-xs text-muted-foreground">
                    {formData.discountType === 'PERCENT' ? '(%)' :
                     formData.discountType === 'FIXED' ? '(VND)' : ''}
                  </span>
                </Label>
                {formData.discountType === 'FREESHIP' ? (
                  <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    Tự động = 0 (miễn ship)
                  </div>
                ) : (
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      discountValue: e.target.value === '' ? '' : Number(e.target.value),
                    }))}
                    placeholder="0"
                    min={0}
                    max={formData.discountType === 'PERCENT' ? 100 : undefined}
                  />
                )}
              </div>
            </div>

            {/* 🔥 Đơn tối thiểu + Giảm tối đa */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Đơn tối thiểu{' '}
                  <span className="text-xs text-muted-foreground">(VND, bỏ trống = 0)</span>
                </Label>
                <Input
                  type="number"
                  value={formData.minOrderValue}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    minOrderValue: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  placeholder="VD: 200000"
                  min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  Giảm tối đa{' '}
                  <span className="text-xs text-muted-foreground">
                    {formData.discountType === 'PERCENT' ? '(VND, cho mã %)' : '(không áp dụng)'}
                  </span>
                </Label>
                <Input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    maxDiscount: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  placeholder="VD: 50000"
                  min={0}
                  disabled={formData.discountType !== 'PERCENT'}
                />
              </div>
            </div>

            {/* Ngày bắt đầu + Số ngày */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>
                  Ngày bắt đầu{' '}
                  <span className="text-xs text-muted-foreground">(bỏ trống = hôm nay)</span>
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Số ngày hiệu lực *</Label>
                <Input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    durationDays: e.target.value === '' ? '' : Number(e.target.value),
                  }))}
                  placeholder="VD: 30"
                  min={1}
                />
              </div>
            </div>

            {/* Giới hạn sử dụng */}
            <div className="grid gap-2">
              <Label>Giới hạn sử dụng *</Label>
              <Input
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  usageLimit: e.target.value === '' ? '' : Number(e.target.value),
                }))}
                placeholder="VD: 100"
                min={1}
              />
            </div>

            {/* Trạng thái */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Kích hoạt mã</p>
                <p className="text-xs text-muted-foreground">Cho phép khách hàng sử dụng mã này</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, status: !prev.status }))}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.status ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  formData.status ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Đang xử lý...' : selectedPromotion ? 'Cập nhật' : 'Tạo mã'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ─────────────────────────────────────────────────── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa mã khuyến mãi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa mã &quot;{selectedPromotion?.code}&quot;?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}