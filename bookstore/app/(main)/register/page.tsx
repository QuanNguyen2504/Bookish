'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/lib/store/auth-store';
import { toast } from 'sonner';

const registerSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, 'Bạn phải đồng ý với điều khoản'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

function FieldInput({ type, placeholder, register: reg, error, show, onToggle }: {
  type: string; placeholder: string; register: any; error?: string;
  show?: boolean; onToggle?: () => void;
}) {
  const isPassword = type === 'password' || (type === 'text' && onToggle);
  return (
    <div>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          {...reg}
          className="w-full px-4 py-3 rounded-xl text-[15px] outline-none transition-all"
          style={{ background: '#f5f5f7', border: error ? '1.5px solid #ff3b30' : '1.5px solid transparent', color: '#1d1d1f', paddingRight: onToggle ? '44px' : undefined }}
          onFocus={(e) => { if (!error) e.target.style.border = '1.5px solid #0071e3'; }}
          onBlur={(e) => { e.target.style.border = error ? '1.5px solid #ff3b30' : '1.5px solid transparent'; }}
        />
        {onToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6e6e73' }}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-[12px] mt-1.5" style={{ color: '#ff3b30' }}>{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register: registerUser, isLoading } = useAuthStore();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { acceptTerms: false },
  });
  const acceptTerms = watch('acceptTerms');

  const onSubmit = async (data: RegisterForm) => {
    const result = await registerUser(data.username, data.email, data.password);
    if (result.success) { 
  toast.success(result.message); 
  router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
}
    else toast.error(result.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: '#f5f5f7' }}>
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="text-[28px] font-bold tracking-[-0.03em]" style={{ color: '#1d1d1f' }}>Bookish</Link>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] mt-5 mb-1.5" style={{ color: '#1d1d1f' }}>Tạo tài khoản mới</h1>
          <p className="text-[15px]" style={{ color: '#6e6e73' }}>Tham gia cộng đồng yêu sách Bookish</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#ffffff', border: '1px solid #d2d2d7' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>Tên đăng nhập</label>
              <FieldInput type="text" placeholder="Nhập tên đăng nhập" register={register('username')} error={errors.username?.message} />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>Email</label>
              <FieldInput type="email" placeholder="email@example.com" register={register('email')} error={errors.email?.message} />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>Mật khẩu</label>
              <FieldInput
                type={showPassword ? 'text' : 'password'}
                placeholder="Tối thiểu 8 ký tự, có 1 chữ hoa"
                register={register('password')}
                error={errors.password?.message}
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: '#1d1d1f' }}>Xác nhận mật khẩu</label>
              <FieldInput
                type={showConfirm ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                register={register('confirmPassword')}
                error={errors.confirmPassword?.message}
                show={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
              />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(c) => setValue('acceptTerms', c as boolean)} />
              <label htmlFor="terms" className="text-[13px] leading-snug" style={{ color: '#6e6e73' }}>
                Tôi đồng ý với{' '}
                <Link href="#" style={{ color: '#0071e3' }}>Điều khoản sử dụng</Link>{' '}và{' '}
                <Link href="#" style={{ color: '#0071e3' }}>Chính sách bảo mật</Link>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-[12px]" style={{ color: '#ff3b30' }}>{errors.acceptTerms.message}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-[15px] font-medium text-white transition-opacity mt-2"
              style={{ background: '#0071e3' }}
              onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              {isLoading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng ký...</span> : 'Đăng ký'}
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] mt-6" style={{ color: '#6e6e73' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-medium" style={{ color: '#0071e3' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}