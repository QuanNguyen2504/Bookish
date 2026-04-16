import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

// Font Inter cho body text
const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  variable: '--font-inter'
});

// Font Playfair Display cho heading
const playfair = Playfair_Display({ 
  subsets: ["latin", "vietnamese"],
  variable: '--font-playfair'
});

export const metadata: Metadata = {
  title: 'Bookish - Nhà Sách Online Mùa Thu',
  description: 'Khám phá thế giới sách với Bookish - Nơi những trang sách mang hương mùa thu',
  keywords: ['sách', 'nhà sách', 'bookish', 'mua sách online'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}