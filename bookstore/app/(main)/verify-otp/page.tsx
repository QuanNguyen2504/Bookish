'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth-api';
import { useAuthStore } from '@/lib/store/auth-store';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Đếm ngược nút "Gửi lại"
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Redirect nếu không có email trong URL
  useEffect(() => {
    if (!email) router.push('/register');
  }, [email, router]);

  const handleChange = (index: number, value: string) => {
    // Chỉ cho số, tối đa 1 ký tự
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Tự động nhảy sang ô tiếp
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Tự động submit khi đủ 6 số
    if (newCode.every((d) => d) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      handleVerify(pasted);
    }
  };

  const handleVerify = async (fullCode: string) => {
    setIsVerifying(true);
    try {
      const res = await authApi.verifyEmail(email, fullCode);
      const authData = res.data;

      // Lưu vào store để auto login
      useAuthStore.setState({
        token: authData.token,
        user: {
          id: authData.id,
          username: authData.username,
          role: authData.role,
          avatarUrl: authData.avatarUrl,
        },
        isAuthenticated: true,
        isLoading: false,
      });

      // Load giỏ hàng
      try {
        const { useCartStore } = await import('@/lib/store/cart-store');
        useCartStore.getState().fetchCart(authData.token);
      } catch {}

      toast.success(`Chào mừng, ${authData.username}!`);
      setTimeout(() => router.push('/'), 800);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xác thực thất bại');
      setCode(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification(email);
      toast.success('Đã gửi lại mã xác thực');
      setCountdown(60);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gửi lại thất bại');
    } finally {
      setIsResending(false);
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

        <div className="rounded-2xl p-10 text-center" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#e3f2fd' }}
          >
            <Mail className="h-8 w-8" style={{ color: '#0071e3' }} />
          </div>

          <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#1d1d1f' }}>
            Nhập mã xác thực
          </h1>
          <p className="text-[14px] mb-8 leading-relaxed" style={{ color: '#6e6e73' }}>
            Chúng tôi đã gửi mã 6 chữ số đến
            <br />
            <strong style={{ color: '#1d1d1f' }}>{email}</strong>
          </p>

          {/* 6 ô nhập */}
          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputsRef.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className="w-12 h-14 text-center text-[22px] font-semibold rounded-xl outline-none transition-all"
                style={{
                  background: '#f5f5f7',
                  border: '1.5px solid transparent',
                  color: '#1d1d1f',
                }}
                onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
                onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
              />
            ))}
          </div>

          {isVerifying && (
            <div className="flex items-center justify-center gap-2 mb-4 text-[13px]" style={{ color: '#6e6e73' }}>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang xác thực...
            </div>
          )}

          {/* Nút gửi lại */}
          <div className="pt-4 border-t" style={{ borderColor: '#d2d2d7' }}>
            {countdown > 0 ? (
              <p className="text-[13px]" style={{ color: '#6e6e73' }}>
                Gửi lại mã sau <strong>{countdown}s</strong>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-[13px] font-medium"
                style={{ color: '#0071e3' }}
              >
                {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[13px] mt-6" style={{ color: '#6e6e73' }}>
          Nhập sai email?{' '}
          <Link href="/register" className="font-medium" style={{ color: '#0071e3' }}>
            Đăng ký lại
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f7' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0071e3' }} />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}