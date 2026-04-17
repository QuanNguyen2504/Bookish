
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authorApi, AuthorResponse, AuthorRequest } from '@/lib/api/author-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, BookMarked, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 10;

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function PaginationBar({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}
            className={currentPage === 1 ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
        {getPageNumbers(currentPage, totalPages).map((page, i) => (
          <PaginationItem key={i}>
            {page === '...' ? <PaginationEllipsis /> : (
              <PaginationLink href="#" isActive={page === currentPage}
                onClick={(e) => { e.preventDefault(); onPageChange(page as number); }}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) onPageChange(currentPage + 1); }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-40' : ''} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

interface AuthorFormData {
  name: string;
  bio: string;
  birthDate: string;
}

const initialFormData: AuthorFormData = {
  name: '',
  bio: '',
  birthDate: '',
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export default function AdminAuthorsPage() {
  const { token } = useAuthStore();

  const [authors, setAuthors] = useState<AuthorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorResponse | null>(null);
  const [formData, setFormData] = useState<AuthorFormData>(initialFormData);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAuthors = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await authorApi.getAll();
      setAuthors(data);
    } catch {
      toast.error('Không thể tải danh sách tác giả');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  const filteredAuthors = useMemo(() =>
    authors.filter(a =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [authors, searchTerm]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const totalPages = Math.ceil(filteredAuthors.length / PAGE_SIZE);
  const paginatedAuthors = filteredAuthors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleOpenDialog = (author?: AuthorResponse) => {
    if (author) {
      setSelectedAuthor(author);
      setFormData({
        name: author.name,
        bio: author.bio || '',
        birthDate: author.birthDate || '',
      });
    } else {
      setSelectedAuthor(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!token) return;
    const body: AuthorRequest = {
      name: formData.name,
      bio: formData.bio,
      birthDate: formData.birthDate || null,
    };

    try {
      setIsSaving(true);
      if (selectedAuthor) {
        const updated = await authorApi.update(selectedAuthor.id, body, token);
        setAuthors(prev => prev.map(a => a.id === selectedAuthor.id ? updated : a));
        toast.success('Cập nhật tác giả thành công');
      } else {
        const created = await authorApi.create(body, token);
        setAuthors(prev => [...prev, created]);
        toast.success('Thêm tác giả thành công');
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAuthor || !token) return;
    try {
      setIsDeleting(true);
      await authorApi.delete(selectedAuthor.id, token);
      setAuthors(prev => prev.filter(a => a.id !== selectedAuthor.id));
      setIsDeleteDialogOpen(false);
      setSelectedAuthor(null);
      toast.success(`Đã xóa tác giả "${selectedAuthor.name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa tác giả');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Tác giả</h1>
          <p className="text-muted-foreground">Quản lý danh sách tác giả</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm tác giả
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tác giả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Danh sách tác giả ({filteredAuthors.length})
            {totalPages > 1 && (
              <span className="text-sm font-normal text-muted-foreground">
                — Trang {currentPage}/{totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên tác giả</TableHead>
                  <TableHead>Tiểu sử</TableHead>
                  <TableHead>Ngày sinh</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuthors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Không có tác giả nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAuthors.map((author) => (
                    <TableRow key={author.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{author.name}</span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {author.bio || 'Chưa có tiểu sử'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(author.birthDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenDialog(author)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              setSelectedAuthor(author);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <PaginationBar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedAuthor ? 'Chỉnh sửa tác giả' : 'Thêm tác giả mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên tác giả *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nhập tên tác giả"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthDate">Ngày sinh</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Tiểu sử</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Nhập tiểu sử tác giả..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>
              ) : selectedAuthor ? 'Cập nhật' : 'Thêm tác giả'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tác giả</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tác giả &quot;{selectedAuthor?.name}&quot;?
              Điều này có thể ảnh hưởng đến các sách của tác giả này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAuthor(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xóa...</>
              ) : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}