'use client';

import { useEffect, useState, useRef, Suspense, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Package, Settings, Loader2, Save, ChevronRight, Camera, Trash2, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/auth-store';
import { useOrderStore } from '@/lib/store/order-store';
import { OrderResponse } from '@/lib/api/order-api';
import { customerApi } from '@/lib/api/customer-api';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

const profileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:    { label: 'Chờ xác nhận', className: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { label: 'Đã xác nhận',  className: 'bg-blue-100 text-blue-800' },
  PROCESSING: { label: 'Đang xử lý',   className: 'bg-purple-100 text-purple-800' },
  SHIPPING:   { label: 'Đang giao',    className: 'bg-orange-100 text-orange-800' },
  DELIVERED:  { label: 'Đã giao',      className: 'bg-green-100 text-green-800' },
  CANCELLED:  { label: 'Đã hủy',       className: 'bg-red-100 text-red-800' },
};

function OrderRow({ order }: { order: OrderResponse }) {
  const status = statusConfig[order.status] ?? { label: order.status, className: 'bg-gray-100 text-gray-800' };
  return (
    <Link href={`/orders/${order.orderId}`}
      className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors border-b border-border last:border-0">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-medium text-foreground text-sm">
            Đơn #{String(order.orderId).padStart(6, '0')}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })} · {order.items.length} sản phẩm
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-primary text-sm">{order.totalPrice.toLocaleString('vi-VN')}đ</p>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, updateAvatar } = useAuthStore();
  const token = useAuthStore((state) => state.token);
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isLoading, setIsLoading] = useState(false);

  // --- Change password state ---
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- Avatar state ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile';
    setActiveTab(tab);
    if (tab === 'orders' && token) fetchOrders(token);
  }, [searchParams]);

  // Redirect nếu chưa đăng nhập + reset form
  useEffect(() => {
    if (!isAuthenticated) { router.push('/login?redirect=/profile'); return; }
    if (user) {
      startTransition(() => {
        reset({ name: user.username ?? '', phone: '', address: '' });
      });
    }
  }, [isAuthenticated, user, router, reset]);

  // Tách riêng để tránh conflict với reset() của react-hook-form
  useEffect(() => {
    if (user) {
      startTransition(() => {
        setAvatarUrl(user.avatarUrl ?? null);
      });
    }
  }, [user]);

  if (!isAuthenticated || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    toast.success('Cập nhật thông tin thành công!');
  };

  const handleChangePassword = async () => {
    if (!token || !user?.id) return;
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/customers/${user.id}/change-password`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Đổi mật khẩu thất bại');
      }
      toast.success('Đổi mật khẩu thành công!');
      setShowPasswordForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPwLoading(false);
    }
  };

  // Khi người dùng chọn file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !user?.id) return;

    // Preview tức thì trước khi upload
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);

    setAvatarLoading(true);
    try {
      const updated = await customerApi.uploadAvatar(user.id, file, token);
      setAvatarUrl(updated.avatarUrl);
      updateAvatar(updated.avatarUrl);  // đồng bộ vào store
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Upload ảnh thất bại');
      setAvatarUrl(user.avatarUrl ?? null); // rollback preview
    } finally {
      setAvatarLoading(false);
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Xóa avatar
  const handleDeleteAvatar = async () => {
    if (!token || !user?.id) return;
    setAvatarLoading(true);
    try {
      await customerApi.deleteAvatar(user.id, token);
      setAvatarUrl(null);
      updateAvatar(null);  // đồng bộ vào store
      toast.success('Đã xóa ảnh đại diện');
    } catch (err: any) {
      toast.error(err.message || 'Xóa ảnh thất bại');
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Nút quay lại admin nếu là ADMIN/STAFF */}
        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <div className="mb-4">
            <Link href="/admin"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
              ← Quay lại trang quản trị
            </Link>
          </div>
        )}
        <h1 className="text-3xl font-bold text-foreground mb-8">Tài khoản của tôi</h1>

        <Tabs value={activeTab} className="space-y-8"
          onValueChange={(tab) => { setActiveTab(tab); if (tab === 'orders' && token) fetchOrders(token); }}>
          <TabsList className="bg-muted/50 p-1 rounded-full">
            <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-card">
              <User className="h-4 w-4 mr-2" />Hồ sơ
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full data-[state=active]:bg-card">
              <Package className="h-4 w-4 mr-2" />Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-card">
              <Settings className="h-4 w-4 mr-2" />Cài đặt
            </TabsTrigger>
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-8">

              {/* Avatar card */}
              <div className="bg-card rounded-2xl border border-border p-6 text-center h-fit">

                {/* Avatar + nút chọn ảnh */}
                <div className="relative w-24 h-24 mx-auto mb-4">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      fill
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {(user.username ?? 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Overlay loading */}
                  {avatarLoading && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}

                  {/* Nút camera */}
                  {!avatarLoading && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/80 transition-colors"
                      title="Đổi ảnh đại diện"
                    >
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                </div>

                {/* Input file ẩn */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <h2 className="font-semibold text-foreground text-lg">{user.username}</h2>
                <Badge className="mt-3" variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {user.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                </Badge>

                {/* Nút xóa avatar (chỉ hiện khi có ảnh) */}
                {avatarUrl && !avatarLoading && (
                  <button
                    onClick={handleDeleteAvatar}
                    className="mt-4 flex items-center gap-1 text-xs text-destructive hover:underline mx-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Xóa ảnh đại diện
                  </button>
                )}
              </div>

              {/* Form thông tin */}
              <div className="md:col-span-2 bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground text-lg mb-6">Thông tin cá nhân</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Họ và tên</Label>
                      <Input id="name" className="rounded-xl" {...register('name')} />
                      {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <Input id="phone" className="rounded-xl" placeholder="0901234567" {...register('phone')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Địa chỉ</Label>
                    <Input id="address" className="rounded-xl" placeholder="Số nhà, tên đường" {...register('address')} />
                  </div>
                  <Button type="submit" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : <><Save className="h-4 w-4 mr-2" />Lưu thay đổi</>}
                  </Button>
                </form>
              </div>
            </motion.div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-lg">Lịch sử đơn hàng</h3>
                {orders.length > 0 && <span className="text-sm text-muted-foreground">{orders.length} đơn hàng</span>}
              </div>
              {ordersLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Bạn chưa có đơn hàng nào</p>
                  <Link href="/shop"><Button className="rounded-full">Mua sắm ngay</Button></Link>
                </div>
              ) : (
                <div>{orders.map((order) => <OrderRow key={order.orderId} order={order} />)}</div>
              )}
            </motion.div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="font-semibold text-foreground text-lg">Cài đặt tài khoản</h3>
              </div>
              <div className="divide-y divide-border">

                {/* Đổi mật khẩu */}
                <div>
                  <button
                    onClick={() => setShowPasswordForm((v) => !v)}
                    className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">Đổi mật khẩu</p>
                        <p className="text-sm text-muted-foreground">Cập nhật mật khẩu đăng nhập</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
                  </button>

                  {showPasswordForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-6 space-y-4">

                      {/* Mật khẩu hiện tại */}
                      <div className="space-y-1.5">
                        <Label>Mật khẩu hiện tại</Label>
                        <div className="relative">
                          <Input
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="rounded-xl pr-10"
                            placeholder="Nhập mật khẩu hiện tại"
                          />
                          <button type="button" onClick={() => setShowCurrent(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Mật khẩu mới */}
                      <div className="space-y-1.5">
                        <Label>Mật khẩu mới</Label>
                        <div className="relative">
                          <Input
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="rounded-xl pr-10"
                            placeholder="Tối thiểu 8 ký tự"
                          />
                          <button type="button" onClick={() => setShowNew(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Xác nhận mật khẩu */}
                      <div className="space-y-1.5">
                        <Label>Xác nhận mật khẩu mới</Label>
                        <div className="relative">
                          <Input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="rounded-xl pr-10"
                            placeholder="Nhập lại mật khẩu mới"
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button onClick={handleChangePassword} disabled={pwLoading}
                          className="rounded-full bg-primary hover:bg-primary/90">
                          {pwLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</> : 'Lưu mật khẩu'}
                        </Button>
                        <Button variant="ghost" className="rounded-full"
                          onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                          Hủy
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                <button className="w-full p-6 flex items-center justify-between hover:bg-muted/30 transition-colors text-left text-destructive">
                  <div>
                    <p className="font-medium">Xóa tài khoản</p>
                    <p className="text-sm opacity-70">Xóa vĩnh viễn tài khoản và dữ liệu</p>
                  </div>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}