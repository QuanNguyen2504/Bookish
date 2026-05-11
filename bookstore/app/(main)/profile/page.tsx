'use client';

import { useEffect, useState, useRef, Suspense, startTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Package, Settings, Loader2, Save, ChevronRight,
  Camera, Trash2, Eye, EyeOff, Lock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useOrderStore } from '@/lib/store/order-store';
import { OrderResponse } from '@/lib/api/order-api';
import { customerApi } from '@/lib/api/customer-api';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

// ── Design tokens (đồng bộ trang chủ) ───────────────────────────────────────
const T = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '1px solid #d2d2d7',
  borderLight: '1px solid #f0f0f0',
  text: '#1d1d1f',
  sub: '#6e6e73',
  accent: '#0071e3',
  accentBg: 'rgba(0,113,227,0.07)',
};

const profileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Chờ xác nhận', color: '#92400e', bg: '#fef3c7' },
  CONFIRMED:  { label: 'Đã xác nhận',  color: '#1e40af', bg: '#dbeafe' },
  PROCESSING: { label: 'Đang xử lý',   color: '#6b21a8', bg: '#f3e8ff' },
  SHIPPING:   { label: 'Đang giao',    color: '#9a3412', bg: '#ffedd5' },
  DELIVERED:  { label: 'Đã giao',      color: '#166534', bg: '#dcfce7' },
  CANCELLED:  { label: 'Đã hủy',       color: '#991b1b', bg: '#fee2e2' },
};

// ── OrderRow ─────────────────────────────────────────────────────────────────
function OrderRow({ order }: { order: OrderResponse }) {
  const status = statusConfig[order.status] ?? { label: order.status, color: '#374151', bg: '#f3f4f6' };
  return (
    <Link
      href={`/orders/${order.orderId}`}
      className="flex items-center justify-between px-6 py-5 transition-colors"
      style={{ borderBottom: '1px solid #f0f0f0' }}
      onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="font-semibold text-[14px]" style={{ color: T.text }}>
            Đơn #{String(order.orderId).padStart(6, '0')}
          </span>
          <span
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </span>
        </div>
        <p className="text-[12px]" style={{ color: T.sub }}>
          {new Date(order.createdAt).toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })} · {order.items.length} sản phẩm
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-[14px]" style={{ color: T.accent }}>
          {order.totalPrice.toLocaleString('vi-VN')}đ
        </p>
        <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: T.sub }} />
      </div>
    </Link>
  );
}

// ── Input helper ─────────────────────────────────────────────────────────────
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: T.sub }}>
        {label}
      </label>
      {children}
      {error && <p className="text-[12px]" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function StyledInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-4 py-2.5 rounded-2xl text-[14px] outline-none transition-all ${className}`}
      style={{ background: T.bg, border: T.border, color: T.text }}
      onFocus={e => (e.currentTarget.style.borderColor = T.accent)}
      onBlur={e => (e.currentTarget.style.borderColor = '#d2d2d7')}
      {...props}
    />
  );
}

// ── ProfileContent ────────────────────────────────────────────────────────────
function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, updateAvatar } = useAuthStore();
  const token = useAuthStore((s) => s.token);
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isLoading, setIsLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwLoading, setPwLoading]   = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile';
    setActiveTab(tab);
    if (tab === 'orders' && token) fetchOrders(token);
  }, [searchParams]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login?redirect=/profile'); return; }
    if (user) startTransition(() => reset({ name: user.username ?? '', phone: '', address: '' }));
  }, [isAuthenticated, user, router, reset]);

  useEffect(() => {
    if (user) startTransition(() => setAvatarUrl(user.avatarUrl ?? null));
  }, [user]);

  if (!isAuthenticated || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.accent }} />
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
    if (newPassword !== confirmPassword) { toast.error('Mật khẩu xác nhận không khớp!'); return; }
    if (newPassword.length < 6) { toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!'); return; }
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
    } catch (e: any) { toast.error(e.message); }
    finally { setPwLoading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !user?.id) return;
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);
    setAvatarLoading(true);
    try {
      const updated = await customerApi.uploadAvatar(user.id, file, token);
      setAvatarUrl(updated.avatarUrl);
      updateAvatar(updated.avatarUrl);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Upload ảnh thất bại');
      setAvatarUrl(user.avatarUrl ?? null);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    if (!token || !user?.id) return;
    setAvatarLoading(true);
    try {
      await customerApi.deleteAvatar(user.id, token);
      setAvatarUrl(null);
      updateAvatar(null);
      toast.success('Đã xóa ảnh đại diện');
    } catch (err: any) {
      toast.error(err.message || 'Xóa ảnh thất bại');
    } finally { setAvatarLoading(false); }
  };

  const tabs = [
    { key: 'profile',  label: 'Hồ sơ',    icon: User },
    { key: 'orders',   label: 'Đơn hàng',  icon: Package },
    { key: 'settings', label: 'Cài đặt',   icon: Settings },
  ];

  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-10">

        {/* Admin link */}
        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <div className="mb-4">
            <Link
              href="/admin"
              className="text-[13px] font-medium transition-opacity"
              style={{ color: T.accent }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              ← Quay lại trang quản trị
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <p className="text-[13px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
            Tài khoản
          </p>
          <h1 className="font-bold tracking-[-0.03em]"
            style={{ fontSize: 'clamp(26px, 4vw, 40px)', color: T.text }}>
            Tài khoản của tôi
          </h1>
        </div>

        {/* Tab bar */}
        <div
          className="inline-flex gap-1 p-1 rounded-full mb-8"
          style={{ background: T.card, border: T.border }}
        >
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  if (key === 'orders' && token) fetchOrders(token);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all"
                style={{
                  background: active ? T.accent : 'transparent',
                  color: active ? '#ffffff' : T.sub,
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.text; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.sub; }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Hồ sơ ── */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Avatar card */}
            <div
              className="rounded-3xl p-6 text-center h-fit"
              style={{ background: T.card, border: T.border }}
            >
              <div className="relative w-24 h-24 mx-auto mb-4">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill className="rounded-full object-cover" />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: T.accentBg }}
                  >
                    <span className="text-3xl font-bold" style={{ color: T.accent }}>
                      {(user.username ?? 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {avatarLoading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}

                {!avatarLoading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-opacity"
                    style={{ background: T.accent }}
                    title="Đổi ảnh đại diện"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Camera className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />

              <h2 className="font-semibold text-[17px]" style={{ color: T.text }}>
                {user.username}
              </h2>

              <span
                className="inline-block mt-3 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={
                  user.role === 'ADMIN'
                    ? { background: T.accent, color: '#fff' }
                    : { background: T.accentBg, color: T.accent }
                }
              >
                {user.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
              </span>

              {avatarUrl && !avatarLoading && (
                <button
                  onClick={handleDeleteAvatar}
                  className="mt-4 flex items-center gap-1 text-[12px] mx-auto transition-opacity"
                  style={{ color: '#dc2626' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <Trash2 className="h-3 w-3" /> Xóa ảnh đại diện
                </button>
              )}
            </div>

            {/* Form thông tin */}
            <div
              className="md:col-span-2 rounded-3xl p-8"
              style={{ background: T.card, border: T.border }}
            >
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1" style={{ color: T.accent }}>
                Hồ sơ
              </p>
              <h3 className="font-bold text-[20px] tracking-[-0.02em] mb-6" style={{ color: T.text }}>
                Thông tin cá nhân
              </h3>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Họ và tên" error={errors.name?.message}>
                    <StyledInput id="name" {...register('name')} />
                  </Field>
                  <Field label="Số điện thoại">
                    <StyledInput id="phone"  {...register('phone')} />
                  </Field>
                </div>
                <Field label="Địa chỉ">
                  <StyledInput id="address" placeholder="Số nhà, tên đường" {...register('address')} />
                </Field>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium text-white transition-opacity disabled:opacity-60"
                  style={{ background: T.accent }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
                    : <><Save className="h-4 w-4" />Lưu thay đổi</>
                  }
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Đơn hàng ── */}
        {activeTab === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: T.card, border: T.border }}
          >
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f0f0f0' }}
            >
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: T.accent }}>
                  Lịch sử
                </p>
                <h3 className="font-bold text-[18px] tracking-[-0.02em]" style={{ color: T.text }}>
                  Đơn hàng của tôi
                </h3>
              </div>
              {orders.length > 0 && (
                <span className="text-[13px]" style={{ color: T.sub }}>{orders.length} đơn hàng</span>
              )}
            </div>

            {ordersLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: T.accent }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4" style={{ color: T.sub }} />
                <p className="text-[15px] mb-6" style={{ color: T.sub }}>Bạn chưa có đơn hàng nào</p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-medium text-white"
                  style={{ background: T.accent }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Mua sắm ngay
                </Link>
              </div>
            ) : (
              <div>
                {orders.map((order) => (
                  <OrderRow key={order.orderId} order={order} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tab: Cài đặt ── */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: T.card, border: T.border }}
          >
            <div className="px-6 py-5" style={{ borderBottom: '1px solid #f0f0f0' }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: T.accent }}>
                Tài khoản
              </p>
              <h3 className="font-bold text-[18px] tracking-[-0.02em]" style={{ color: T.text }}>
                Cài đặt
              </h3>
            </div>

            {/* Đổi mật khẩu */}
            <div style={{ borderBottom: '1px solid #f0f0f0' }}>
              <button
                onClick={() => setShowPasswordForm((v) => !v)}
                className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: T.accentBg }}
                  >
                    <Lock className="h-4 w-4" style={{ color: T.accent }} />
                  </div>
                  <div>
                    <p className="font-semibold text-[14px]" style={{ color: T.text }}>Đổi mật khẩu</p>
                    <p className="text-[12px]" style={{ color: T.sub }}>Cập nhật mật khẩu đăng nhập</p>
                  </div>
                </div>
                <ChevronRight
                  className={`h-5 w-5 transition-transform flex-shrink-0 ${showPasswordForm ? 'rotate-90' : ''}`}
                  style={{ color: T.sub }}
                />
              </button>

              {showPasswordForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 space-y-4">
                    {/* Mật khẩu hiện tại */}
                    <Field label="Mật khẩu hiện tại">
                      <div className="relative">
                        <StyledInput
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        >
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    {/* Mật khẩu mới */}
                    <Field label="Mật khẩu mới">
                      <div className="relative">
                        <StyledInput
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Tối thiểu 6 ký tự"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    {/* Xác nhận mật khẩu */}
                    <Field label="Xác nhận mật khẩu mới">
                      <div className="relative">
                        <StyledInput
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: T.sub }}
                          onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                          onMouseLeave={e => (e.currentTarget.style.color = T.sub)}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleChangePassword}
                        disabled={pwLoading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-opacity disabled:opacity-60"
                        style={{ background: T.accent }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {pwLoading
                          ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
                          : 'Lưu mật khẩu'
                        }
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                        }}
                        className="px-6 py-2.5 rounded-full text-[14px] font-medium transition-all"
                        style={{ color: T.sub, border: T.border, background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Xóa tài khoản */}
            <button
              className="w-full px-6 py-5 flex items-center justify-between text-left transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <p className="font-semibold text-[14px]" style={{ color: '#dc2626' }}>Xóa tài khoản</p>
                <p className="text-[12px]" style={{ color: '#ef4444' }}>Xóa vĩnh viễn tài khoản và dữ liệu</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: '#dc2626' }} />
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.accent }} />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}