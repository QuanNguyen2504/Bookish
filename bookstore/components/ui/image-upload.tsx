'use client';

// components/ui/image-upload.tsx

import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  token?: string;
}

export function ImageUpload({ value, onChange, token }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (jpg, png, webp...)');
      return;
    }

    // Kiểm tra dung lượng (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB');
      return;
    }

    setIsUploading(true);
    setPreviewError(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload thất bại');
      }

      onChange(data.url);
      toast.success('Upload ảnh thành công!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload thất bại');
    } finally {
      setIsUploading(false);
      // Reset input để có thể chọn lại cùng file
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange('');
    setPreviewError(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Khu vực preview */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          value && !previewError ? 'border-transparent' : 'border-muted-foreground/25 bg-muted/20',
          'min-h-[120px]'
        )}
      >
        {value && !previewError ? (
          // Hiển thị ảnh đã chọn
          <div className="relative w-full">
            <img
              src={value}
              alt="Ảnh bìa"
              className="mx-auto max-h-48 rounded-lg object-contain"
              onError={() => setPreviewError(true)}
            />
            {/* Nút xóa ảnh */}
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:opacity-90"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          // Placeholder khi chưa có ảnh
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-40" />
            <p className="text-sm">{previewError ? 'Không tải được ảnh' : 'Chưa có ảnh bìa'}</p>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Input URL + nút chọn file */}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setPreviewError(false); }}
          placeholder="Nhập URL hoặc chọn ảnh từ máy tính..."
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Chọn ảnh
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Hỗ trợ JPG, PNG, WEBP. Tối đa 5MB.</p>

      {/* Input file ẩn */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}