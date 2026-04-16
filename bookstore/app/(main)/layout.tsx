// Layout chính cho các trang public của Bookish
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { FallingLeaves } from '@/components/falling-leaves';
import { Chatbot } from '@/components/chatbot';
import { Toaster } from 'sonner';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hiệu ứng lá rơi */}
      <FallingLeaves />
      
      {/* Navbar */}
      <Navbar />
      
      {/* Main Content */}
      <main className="flex-1 relative z-10">
        {children}
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Chatbot */}
      <Chatbot />
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        richColors 
        toastOptions={{
          style: {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
          },
        }}
      />
    </div>
  );
}
