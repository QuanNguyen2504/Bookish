'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { authorApi, AuthorResponse, AuthorRequest } from '@/lib/api/author-api';
import { categoryApi, CategoryResponse } from '@/lib/api/category-api';
import { bookApi, BookResponse, BookRequest } from '@/lib/api/book-api';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, Filter, UserPlus, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

interface BookFormData {
  title: string;
  description: string;
  price: number | '';
  stock: number | '';
  salePercent: number | '';
  image: string;
  authorIds: number[];
  categoryIds: number[];
}

const initialFormData: BookFormData = {
  title: '', description: '', price: '', stock: '', salePercent: '',
  image: '', authorIds: [], categoryIds: [],
};

export default function AdminBooksPage() {
  const { token } = useAuthStore();

  // Local state — không dùng store
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [authors, setAuthors] = useState<AuthorResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookResponse | null>(null);
  const [formData, setFormData] = useState<BookFormData>(initialFormData);

  const [isAddAuthorOpen, setIsAddAuthorOpen] = useState(false);
  const [newAuthor, setNewAuthor] = useState<AuthorRequest>({ name: '', bio: '', birthDate: null });
  const [isAddingAuthor, setIsAddingAuthor] = useState(false);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await bookApi.getAll();
      setBooks(data);
    } catch {
      toast.error('Không thể tải danh sách sách');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
    authorApi.getAll().then(setAuthors).catch(console.error);
    categoryApi.getAll().then(setCategories).catch(console.error);
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchSearch =
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.authors?.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory =
        categoryFilter === 'all' ||
        book.categories?.includes(categories.find(c => c.id.toString() === categoryFilter)?.name || '');
      return matchSearch && matchCategory;
    });
  }, [books, searchTerm, categoryFilter, categories]);

  const handleOpenDialog = (book?: BookResponse) => {
    if (book) {
      setSelectedBook(book);
      setFormData({
        title: book.title,
        description: book.description,
        price: book.price,
        stock: book.stock,
        salePercent: book.salePercent,
        image: book.image,
        authorIds: authors.filter(a => book.authors?.includes(a.name)).map(a => a.id),
        categoryIds: categories.filter(c => book.categories?.includes(c.name)).map(c => c.id),
      });
    } else {
      setSelectedBook(null);
      setFormData(initialFormData);
    }
    setIsAddAuthorOpen(false);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!token) { toast.error('Bạn chưa đăng nhập!'); return; }
    if (!formData.title.trim()) { toast.error('Vui lòng nhập tên sách!'); return; }
    if (formData.authorIds.length === 0) { toast.error('Vui lòng chọn ít nhất một tác giả!'); return; }
    if (formData.categoryIds.length === 0) { toast.error('Vui lòng chọn ít nhất một danh mục!'); return; }

    const body: BookRequest = {
      title: formData.title,
      description: formData.description,
      price: Number(formData.price) || 0,
      stock: Number(formData.stock) || 0,
      salePercent: Number(formData.salePercent) || 0,
      image: formData.image,
      authorIds: formData.authorIds,
      categoryIds: formData.categoryIds,
    };

    setIsLoading(true);
    try {
      if (selectedBook) {
        const updated = await bookApi.update(selectedBook.bookId, body, token);
        setBooks(prev => prev.map(b => b.bookId === selectedBook.bookId ? updated : b));
        toast.success('Cập nhật sách thành công!');
      } else {
        const created = await bookApi.create(body, token);
        setBooks(prev => [...prev, created]);
        toast.success('Thêm sách thành công!');
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
  console.log('handleDelete called', selectedBook?.bookId);
  if (!selectedBook || !token) return;
  try {
    await bookApi.delete(selectedBook.bookId, token);
    console.log('delete success, updating state');
    setBooks(prev => {
      console.log('prev books:', prev.length);
      return prev.filter(b => b.bookId !== selectedBook.bookId);
    });
    toast.success('Xóa sách thành công!');
  } catch (error) {
    console.log('delete error:', error);
    toast.error(error instanceof Error ? error.message : 'Xóa thất bại');
  }
  setIsDeleteDialogOpen(false);
  setSelectedBook(null);
};

  const toggleAuthor = (id: number) =>
    setFormData(prev => ({
      ...prev,
      authorIds: prev.authorIds.includes(id)
        ? prev.authorIds.filter(a => a !== id)
        : [...prev.authorIds, id],
    }));

  const toggleCategory = (id: number) =>
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter(c => c !== id)
        : [...prev.categoryIds, id],
    }));

  const handleAddAuthor = async () => {
    if (!newAuthor.name.trim()) { toast.error('Vui lòng nhập tên tác giả!'); return; }
    if (!token) { toast.error('Bạn chưa đăng nhập!'); return; }
    setIsAddingAuthor(true);
    try {
      const created = await authorApi.create(newAuthor, token);
      setAuthors(prev => [...prev, created]);
      setFormData(prev => ({ ...prev, authorIds: [...prev.authorIds, created.id] }));
      setNewAuthor({ name: '', bio: '', birthDate: null });
      setIsAddAuthorOpen(false);
      toast.success(`Đã thêm tác giả "${created.name}"!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Thêm tác giả thất bại');
    } finally {
      setIsAddingAuthor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Sách</h1>
          <p className="text-muted-foreground">Quản lý danh sách sách trong cửa hàng</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> Thêm sách mới
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên sách, tác giả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách sách ({filteredBooks.length})
            {isLoading && <span className="ml-2 text-sm font-normal text-muted-foreground">Đang tải...</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên sách</TableHead>
                  <TableHead>Tác giả</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead className="text-center">Giảm %</TableHead>
                  <TableHead className="text-center">Kho</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book) => (
                  <TableRow key={book.bookId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {book.image ? (
                          <img src={book.image} alt={book.title} className="h-14 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-14 w-10 items-center justify-center rounded bg-muted">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <p className="font-medium text-foreground">{book.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>{book.authors?.join(', ') || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {book.categories?.map(cat => (
                          <span key={cat} className="rounded-full bg-muted px-2 py-0.5 text-xs">{cat}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(book.price)}
                    </TableCell>
                    <TableCell className="text-center">
                      {book.salePercent > 0 ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                          -{book.salePercent}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'font-medium',
                        book.stock < 10 ? 'text-red-600' :
                        book.stock < 50 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {book.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(book)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline" size="icon"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => { setSelectedBook(book); setIsDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredBooks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Không có sách nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedBook ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tên sách *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nhập tên sách"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Giá bán (VND) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, price: e.target.value === '' ? '' : Number(e.target.value)
                  }))}
                  placeholder="0" min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label>Số lượng *</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, stock: e.target.value === '' ? '' : Number(e.target.value)
                  }))}
                  placeholder="0" min={0}
                />
              </div>
              <div className="grid gap-2">
                <Label>Giảm giá (%)</Label>
                <Input
                  type="number"
                  value={formData.salePercent}
                  onChange={(e) => setFormData(prev => ({
                    ...prev, salePercent: e.target.value === '' ? '' : Number(e.target.value)
                  }))}
                  placeholder="0" min={0} max={100}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Ảnh bìa</Label>
              <ImageUpload
                value={formData.image}
                onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                token={token ?? undefined}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Tác giả *</Label>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-7 gap-1 text-xs text-primary"
                  onClick={() => setIsAddAuthorOpen(v => !v)}
                >
                  <UserPlus className="h-3 w-3" /> Thêm tác giả mới
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-[52px]">
                {authors.length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có tác giả nào</p>
                )}
                {authors.map(author => (
                  <button key={author.id} type="button" onClick={() => toggleAuthor(author.id)}
                    className={cn('rounded-full px-3 py-1 text-sm transition-colors',
                      formData.authorIds.includes(author.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}>
                    {author.name}
                  </button>
                ))}
              </div>
              {isAddAuthorOpen && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">Thông tin tác giả mới</p>
                  <Input value={newAuthor.name}
                    onChange={(e) => setNewAuthor(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tên tác giả *" />
                  <Input value={newAuthor.bio}
                    onChange={(e) => setNewAuthor(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tiểu sử (tùy chọn)" />
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Ngày sinh (tùy chọn)</Label>
                    <Input type="date" value={newAuthor.birthDate || ''}
                      onChange={(e) => setNewAuthor(prev => ({ ...prev, birthDate: e.target.value || null }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={handleAddAuthor} disabled={isAddingAuthor}>
                      {isAddingAuthor ? 'Đang thêm...' : 'Xác nhận'}
                    </Button>
                    <Button type="button" size="sm" variant="outline"
                      onClick={() => { setIsAddAuthorOpen(false); setNewAuthor({ name: '', bio: '', birthDate: null }); }}>
                      Hủy
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Danh mục *</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-3 min-h-[52px]">
                {categories.map(cat => (
                  <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                    className={cn('rounded-full px-3 py-1 text-sm transition-colors',
                      formData.categoryIds.includes(cat.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Mô tả</Label>
              <Textarea value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả sách..." rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : selectedBook ? 'Cập nhật' : 'Thêm sách'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sách</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sách &quot;{selectedBook?.title}&quot;?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}