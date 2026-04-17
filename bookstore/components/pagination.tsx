'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  page: number;          // trang hiện tại (0-based)
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  showInfo?: boolean;     // hiển thị "Hiển thị 1-10 / 50 kết quả"
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  onSizeChange,
  sizeOptions = [10, 20, 50],
  showInfo = true,
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  // Tạo mảng số trang hiển thị (tối đa 7 nút)
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages: (number | '...')[] = [];

    if (page <= 3) {
      // Đầu: 0 1 2 3 4 ... last
      for (let i = 0; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages - 1);
    } else if (page >= totalPages - 4) {
      // Cuối: 0 ... last-4 last-3 last-2 last-1 last
      pages.push(0);
      pages.push('...');
      for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
    } else {
      // Giữa: 0 ... page-1 page page+1 ... last
      pages.push(0);
      pages.push('...');
      pages.push(page - 1);
      pages.push(page);
      pages.push(page + 1);
      pages.push('...');
      pages.push(totalPages - 1);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      {/* Info */}
      {showInfo && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>
            Hiển thị {from}–{to} / {totalElements} kết quả
          </span>
          {onSizeChange && (
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
            >
              {sizeOptions.map((s) => (
                <option key={s} value={s}>{s} / trang</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={() => onPageChange(0)}
          disabled={page === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          title="Trang đầu"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-sm text-gray-400">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p + 1}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          title="Trang sau"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={page >= totalPages - 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
          title="Trang cuối"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}