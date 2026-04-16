'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth-store';
import { wishlistApi } from '@/lib/api/wishlist-api';

interface Props {
  bookId: number;
  // 'icon' = chỉ icon trái tim (đặt overlay trên ảnh sách)
  // 'button' = nút có chữ "Yêu thích" (đặt cạnh nút Mua)
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

export default function WishlistButton({
  bookId,
  variant = 'icon',
  size = 'md',
}: Props) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Khi load: kiểm tra sách này đã trong wishlist chưa
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await wishlistApi.check(bookId, token);
        if (!cancelled) setLiked(res.inWishlist);
      } catch {
        // im lặng — không cần báo lỗi check
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, token, isAuthenticated]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !token) {
      toast.error('Vui lòng đăng nhập để sử dụng tính năng này');
      router.push(`/login?redirect=/books/${bookId}`);
      return;
    }

    setIsLoading(true);
    try {
      if (liked) {
        await wishlistApi.remove(bookId, token);
        setLiked(false);
        toast.success('Đã xoá khỏi danh sách yêu thích');
      } else {
        await wishlistApi.add(bookId, token);
        setLiked(true);
        toast.success('Đã thêm vào danh sách yêu thích');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  // ============ ICON VARIANT ============
  if (variant === 'icon') {
    const sizeMap = { sm: 32, md: 40, lg: 48 };
    const iconSize = { sm: 16, md: 20, lg: 24 };
    const px = sizeMap[size];

    return (
      <button
        onClick={handleClick}
        disabled={isLoading || isChecking}
        className="rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
        style={{
          width: px,
          height: px,
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        title={liked ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}
      >
        {isLoading || isChecking ? (
          <Loader2
            className="animate-spin"
            style={{ width: iconSize[size], height: iconSize[size], color: '#6e6e73' }}
          />
        ) : (
          <Heart
            style={{
              width: iconSize[size],
              height: iconSize[size],
              color: liked ? '#ff3b30' : '#6e6e73',
              fill: liked ? '#ff3b30' : 'transparent',
              transition: 'all 0.2s',
            }}
          />
        )}
      </button>
    );
  }

  // ============ BUTTON VARIANT ============
  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isChecking}
      className="px-5 py-3 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      style={{
        background: liked ? '#ffeceb' : '#f5f5f7',
        color: liked ? '#ff3b30' : '#1d1d1f',
        border: liked ? '1.5px solid #ff3b30' : '1.5px solid transparent',
      }}
    >
      {isLoading || isChecking ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart
          className="h-4 w-4"
          style={{
            color: liked ? '#ff3b30' : '#1d1d1f',
            fill: liked ? '#ff3b30' : 'transparent',
          }}
        />
      )}
      {liked ? 'Đã yêu thích' : 'Yêu thích'}
    </button>
  );
}
