'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth-api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      toast.error('Vui lòng nhập mã 6 chữ số');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword)) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự và 1 chữ hoa');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword(email, code, newPassword);
      toast.success(res.message);
      router.push('/login');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Đặt lại thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: '#f5f5f7' }}>
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: '#1d1d1f' }}>
            Bookish
          </Link>
        </div>

        <div className="rounded-2xl p-10" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#fff3e0' }}>
              <Lock className="h-8 w-8" style={{ color: '#ff6b35' }} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#1d1d1f' }}>
              Đặt mật khẩu mới
            </h1>
            <p className="text-[13px]" style={{ color: '#6e6e73' }}>
              Mã đã được gửi đến <strong style={{ color: '#1d1d1f' }}>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>
                Mã 6 chữ số
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl text-[18px] tracking-[8px] text-center font-semibold outline-none transition-all"
                style={{ background: '#f5f5f7', border: '1.5px solid transparent', color: '#1d1d1f' }}
                onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
                onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tối thiểu 8 ký tự, có 1 chữ hoa"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-[15px] outline-none transition-all"
                  style={{ background: '#f5f5f7', border: '1.5px solid transparent', color: '#1d1d1f' }}
                  onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
                  onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6e6e73' }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>
                Xác nhận mật khẩu
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                style={{ background: '#f5f5f7', border: '1.5px solid transparent', color: '#1d1d1f' }}
                onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
                onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-[15px] font-medium text-white transition-opacity mt-2"
              style={{ background: '#0071e3' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đặt lại...
                </span>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] mt-6" style={{ color: '#6e6e73' }}>
          Không nhận được mã?{' '}
          <Link href="/forgot-password" className="font-medium" style={{ color: '#0071e3' }}>
            Gửi lại
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0071e3' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}