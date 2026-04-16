'use client';

// Trang thông báo đặt hàng thành công
import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Package, ArrowRight, Leaf, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  useEffect(() => {
    // Bắn pháo hoa khi vào trang
    const duration = 2 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ['#D97757', '#F4A261', '#A67C5D', '#E9C46A'];
    
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
      
      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center"
        >
          <CheckCircle2 className="h-14 w-14 text-green-600" />
        </motion.div>
        
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4"
        >
          Đặt hàng thành công!
        </motion.h1>
        
        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6"
        >
          Cảm ơn bạn đã đặt hàng tại Bookish. Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng trong thời gian sớm nhất.
        </motion.p>
        
        {/* Order ID */}
        {orderId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-muted/50 rounded-2xl p-6 mb-8"
          >
            <p className="text-sm text-muted-foreground mb-2">Mã đơn hàng của bạn</p>
            <p className="text-2xl font-bold text-primary tracking-wider">
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </motion.div>
        )}
        
        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 gap-4 mb-8"
        >
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-foreground">Đang xử lý</p>
            <p className="text-xs text-muted-foreground">Đơn hàng của bạn</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Leaf className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-foreground">Giao hàng nhanh</p>
            <p className="text-xs text-muted-foreground">2-5 ngày làm việc</p>
          </div>
        </motion.div>
        
        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/profile?tab=orders">
            <Button variant="outline" className="rounded-full w-full sm:w-auto">
              Xem đơn hàng
            </Button>
          </Link>
          <Link href="/shop">
            <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              Tiếp tục mua sắm
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
