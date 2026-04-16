'use client';

import Link from 'next/link';

const footerSections = [
  {
    title: 'Cửa hàng',
    links: [
      { label: 'Tất cả sách', href: '/shop' },
      { label: 'Sách bán chạy', href: '/shop?filter=bestseller' },
      { label: 'Sách mới', href: '/shop?filter=new' },
      { label: 'Khuyến mãi', href: '/shop?filter=sale' },
    ],
  },
  {
    title: 'Danh mục',
    links: [
      { label: 'Văn học', href: '/shop?category=van-hoc' },
      { label: 'Kinh tế', href: '/shop?category=kinh-te' },
      { label: 'Tâm lý', href: '/shop?category=tam-ly' },
      { label: 'Thiếu nhi', href: '/shop?category=thieu-nhi' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Hướng dẫn mua hàng', href: '#' },
      { label: 'Chính sách đổi trả', href: '#' },
      { label: 'Chính sách bảo mật', href: '#' },
      { label: 'Liên hệ', href: '#' },
    ],
  },
  {
    title: 'Về Bookish',
    links: [
      { label: 'Giới thiệu', href: '#' },
      { label: 'Tuyển dụng', href: '#' },
      { label: 'Tin tức', href: '#' },
      { label: 'Đối tác', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ background: '#f5f5f7' }}>
      {/* Top divider */}
      <div className="max-w-[980px] mx-auto">
        <div style={{ borderTop: '1px solid #d2d2d7' }} />
      </div>

      {/* Links grid */}
      <div className="max-w-[980px] mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {footerSections.map((section) => (
            <div key={section.title}>
              <p
                className="text-[14px] font-semibold mb-3"
                style={{ color: '#1d1d1f' }}
              >
                {section.title}
              </p>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] transition-colors"
                      style={{ color: '#6e6e73' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#1d1d1f')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#6e6e73')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-[980px] mx-auto px-6">
        <div style={{ borderTop: '1px solid #d2d2d7' }} />
        <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-[13px]" style={{ color: '#6e6e73' }}>
            Copyright © {new Date().getFullYear()} Bookish. Bảo lưu mọi quyền.
          </p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Chính sách bảo mật', href: '#' },
              { label: 'Điều khoản sử dụng', href: '#' },
              { label: 'Bản đồ trang web', href: '#' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] transition-colors"
                style={{ color: '#6e6e73' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1d1d1f')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6e6e73')}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
