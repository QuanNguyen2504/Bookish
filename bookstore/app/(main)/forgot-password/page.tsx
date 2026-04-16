'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth-api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      toast.success(res.message);
      // Chuyển sang trang reset, kèm email
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
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
              <Mail className="h-8 w-8" style={{ color: '#ff6b35' }} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#1d1d1f' }}>
              Quên mật khẩu?
            </h1>
            <p className="text-[14px] leading-relaxed" style={{ color: '#6e6e73' }}>
              Nhập email đã đăng ký, chúng tôi sẽ gửi mã đặt lại mật khẩu cho bạn.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
              style={{ background: '#f5f5f7', border: '1.5px solid transparent', color: '#1d1d1f' }}
              onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
              onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-[15px] font-medium text-white transition-opacity"
              style={{ background: '#0071e3' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi...
                </span>
              ) : (
                'Gửi mã đặt lại'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] mt-6" style={{ color: '#6e6e73' }}>
          Nhớ ra mật khẩu?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#0071e3' }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}