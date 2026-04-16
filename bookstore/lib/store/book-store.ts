'use client';

// lib/store/book-store.ts - Kết nối với Spring Boot backend

import { create } from 'zustand';
import { bookApi, BookResponse, BookRequest } from '@/lib/api/book-api';

interface BookState {
  books: BookResponse[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAll: () => Promise<void>;
  fetchById: (id: number) => Promise<BookResponse | null>;
  search: (keyword: string) => Promise<void>;
  create: (body: BookRequest, token: string) => Promise<{ success: boolean; message: string }>;
  update: (id: number, body: BookRequest, token: string) => Promise<{ success: boolean; message: string }>;
  delete: (id: number, token: string) => Promise<{ success: boolean; message: string }>;
  clearError: () => void;
}

export const useBookStore = create<BookState>()((set) => ({
  books: [],
  isLoading: false,
  error: null,

  // Lấy tất cả sách
  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await bookApi.getAll();
      set({ books, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải danh sách sách';
      set({ error: message, isLoading: false });
    }
  },

  // Lấy sách theo ID
  fetchById: async (id: number) => {
    try {
      return await bookApi.getById(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không tìm thấy sách';
      set({ error: message });
      return null;
    }
  },

  // Tìm kiếm sách theo tên
  search: async (keyword: string) => {
    set({ isLoading: true, error: null });
    try {
      const books = await bookApi.search(keyword);
      set({ books, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tìm kiếm thất bại';
      set({ error: message, isLoading: false });
    }
  },

  // Thêm sách mới
  create: async (body: BookRequest, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const newBook = await bookApi.create(body, token);
      set((state) => ({
        books: [...state.books, newBook],
        isLoading: false,
      }));
      return { success: true, message: 'Thêm sách thành công!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Thêm sách thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Sửa sách
  update: async (id: number, body: BookRequest, token: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookApi.update(id, body, token);
      set((state) => ({
        books: state.books.map((b) => (b.bookId === id ? updated : b)),
        isLoading: false,
      }));
      return { success: true, message: 'Cập nhật sách thành công!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cập nhật sách thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Xóa sách
  delete: async (id: number, token: string) => {
    set({ isLoading: true, error: null });
    try {
      await bookApi.delete(id, token);
      set((state) => ({
        books: state.books.filter((b) => b.bookId !== id),
        isLoading: false,
      }));
      return { success: true, message: 'Xóa sách thành công!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa sách thất bại';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearError: () => set({ error: null }),
}));