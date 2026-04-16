'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Mail, X } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api/auth-api';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  //  Trạng thái cho modal đổi email
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ username: string; password: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    const result = await login(data.username, data.password);
    if (result.success) {
      toast.success(result.message);
      const { user } = useAuthStore.getState();
      if (redirect) router.push(redirect);
      else if (user?.role === 'ADMIN' || user?.role === 'STAFF') router.push('/admin');
      else router.push('/');
    } else {
      toast.error(result.message);
      //  Nếu lỗi là chưa verify email → lưu credentials để đổi email
      if (result.message?.includes('chưa được xác thực') || result.message?.includes('chưa xác thực')) {
        setSavedCredentials({ username: data.username, password: data.password });
      }
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !savedCredentials) {
      toast.error('Vui lòng nhập email mới');
      return;
    }
    setIsChanging(true);
    try {
      const res = await authApi.changeEmail(
        savedCredentials.username,
        savedCredentials.password,
        newEmail.trim()
      );
      toast.success(res.message);
      setShowChangeEmail(false);
      setNewEmail('');
      setSavedCredentials(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Đổi email thất bại');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: '#f5f5f7' }}>
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: '#1d1d1f' }}>
            Bookish
          </Link>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-5 mb-1.5" style={{ color: '#1d1d1f' }}>
            Đăng nhập vào Bookish
          </h1>
          <p className="text-[15px]" style={{ color: '#6e6e73' }}>
            Khám phá hàng nghìn cuốn sách hay
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-8" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>
                Tên đăng nhập
              </label>
              <input
                type="text"
                placeholder="Nhập tên đăng nhập"
                {...register('username')}
                className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
                style={{ background: '#f5f5f7', border: errors.username ? '1.5px solid #ff3b30' : '1.5px solid transparent', color: '#1d1d1f' }}
                onFocus={(e) => { if (!errors.username) e.target.style.border = '1.5px solid #0071e3'; }}
                onBlur={(e) => { e.target.style.border = errors.username ? '1.5px solid #ff3b30' : '1.5px solid transparent'; }}
              />
              {errors.username && <p className="text-[12px] mt-1.5" style={{ color: '#ff3b30' }}>{errors.username.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-medium" style={{ color: '#1d1d1f' }}>Mật khẩu</label>
                <Link href="/forgot-password" className="text-[13px]" style={{ color: '#0071e3' }}>Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-[15px] outline-none transition-all"
                  style={{ background: '#f5f5f7', border: errors.password ? '1.5px solid #ff3b30' : '1.5px solid transparent', color: '#1d1d1f' }}
                  onFocus={(e) => { if (!errors.password) e.target.style.border = '1.5px solid #0071e3'; }}
                  onBlur={(e) => { e.target.style.border = errors.password ? '1.5px solid #ff3b30' : '1.5px solid transparent'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6e6e73' }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[12px] mt-1.5" style={{ color: '#ff3b30' }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-[15px] font-medium text-white transition-opacity"
              style={{ background: '#0071e3' }}
              onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...</span> : 'Đăng nhập'}
            </button>

            {/*  Banner hiện ra khi login bị chặn vì chưa verify */}
            {savedCredentials && !showChangeEmail && (
              <div className="rounded-xl p-4" style={{ background: '#fff8e1', border: '1px solid #ffc107' }}>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#f57c00' }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium mb-1" style={{ color: '#1d1d1f' }}>
                      Email chưa được xác thực
                    </p>
                    <p className="text-[12px] mb-2" style={{ color: '#6e6e73' }}>
                      Không nhận được email? Có thể bạn đã nhập sai địa chỉ.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowChangeEmail(true)}
                      className="text-[12px] font-medium underline"
                      style={{ color: '#0071e3' }}
                    >
                      Đổi sang email khác
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-[14px] mt-6" style={{ color: '#6e6e73' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-medium" style={{ color: '#0071e3' }}>Đăng ký ngay</Link>
        </p>
      </div>

      {/*  Modal đổi email */}
      {showChangeEmail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => !isChanging && setShowChangeEmail(false)}
        >
          <div
            className="rounded-2xl p-8 max-w-[440px] w-full relative"
            style={{ background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowChangeEmail(false)}
              disabled={isChanging}
              className="absolute right-4 top-4"
              style={{ color: '#6e6e73' }}
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
              style={{ background: '#e3f2fd' }}
            >
              <Mail className="h-7 w-7" style={{ color: '#0071e3' }} />
            </div>

            <h2
              className="text-[20px] font-semibold tracking-[-0.02em] mb-2"
              style={{ color: '#1d1d1f' }}
            >
              Đổi email xác thực
            </h2>
            <p className="text-[14px] mb-5 leading-relaxed" style={{ color: '#6e6e73' }}>
              Nhập địa chỉ email mới. Chúng tôi sẽ gửi liên kết xác thực đến địa chỉ này.
            </p>

            <input
              type="email"
              placeholder="Nhập email mới"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={isChanging}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all mb-4"
              style={{
                background: '#f5f5f7',
                border: '1.5px solid transparent',
                color: '#1d1d1f',
              }}
              onFocus={(e) => (e.target.style.border = '1.5px solid #0071e3')}
              onBlur={(e) => (e.target.style.border = '1.5px solid transparent')}
            />

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowChangeEmail(false)}
                disabled={isChanging}
                className="flex-1 py-3 rounded-xl text-[15px] font-medium transition-colors"
                style={{ background: '#f5f5f7', color: '#1d1d1f' }}
              >
                Huỷ
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={isChanging}
                className="flex-1 py-3 rounded-xl text-[15px] font-medium text-white transition-opacity disabled:opacity-60"
                style={{ background: '#0071e3' }}
              >
                {isChanging ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang gửi...
                  </span>
                ) : (
                  'Gửi email xác thực'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}