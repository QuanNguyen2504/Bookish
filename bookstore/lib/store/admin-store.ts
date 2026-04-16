'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Book, 
  Category, 
  Author, 
  Order, 
  User, 
  PromoCode,
  OrderStatus 
} from '@/lib/types';
import { 
  books as initialBooks, 
  categories as initialCategories, 
  authors as initialAuthors, 
  orders as initialOrders, 
  users as initialUsers, 
  promoCodes as initialPromoCodes 
} from '@/lib/data';

interface AdminState {
  // Data
  books: Book[];
  categories: Category[];
  authors: Author[];
  orders: Order[];
  users: User[];
  promoCodes: PromoCode[];
  
  // Book CRUD
  addBook: (book: Omit<Book, 'id'>) => void;
  updateBook: (id: string, book: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  
  // Category CRUD
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  
  // Author CRUD
  addAuthor: (author: Omit<Author, 'id'>) => void;
  updateAuthor: (id: string, author: Partial<Author>) => void;
  deleteAuthor: (id: string) => void;
  
  // Order management
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  
  // User management
  toggleUserStatus: (userId: string) => void;
  
  // PromoCode CRUD
  addPromoCode: (promo: Omit<PromoCode, 'id'>) => void;
  updatePromoCode: (id: string, promo: Partial<PromoCode>) => void;
  deletePromoCode: (id: string) => void;
  togglePromoStatus: (id: string) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      // Initial data
      books: initialBooks,
      categories: initialCategories,
      authors: initialAuthors,
      orders: initialOrders,
      users: initialUsers,
      promoCodes: initialPromoCodes,
      
      // Book CRUD
      addBook: (book) => set((state) => ({
        books: [...state.books, { ...book, id: `book-${Date.now()}` }]
      })),
      
      updateBook: (id, bookData) => set((state) => ({
        books: state.books.map(book => 
          book.id === id ? { ...book, ...bookData } : book
        )
      })),
      
      deleteBook: (id) => set((state) => ({
        books: state.books.filter(book => book.id !== id)
      })),
      
      // Category CRUD
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, { 
          ...category, 
          id: `cat-${Date.now()}`,
          createdAt: new Date().toISOString()
        }]
      })),
      
      updateCategory: (id, categoryData) => set((state) => ({
        categories: state.categories.map(cat => 
          cat.id === id ? { ...cat, ...categoryData } : cat
        )
      })),
      
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(cat => cat.id !== id)
      })),
      
      // Author CRUD
      addAuthor: (author) => set((state) => ({
        authors: [...state.authors, { 
          ...author, 
          id: `auth-${Date.now()}`,
          createdAt: new Date().toISOString()
        }]
      })),
      
      updateAuthor: (id, authorData) => set((state) => ({
        authors: state.authors.map(auth => 
          auth.id === id ? { ...auth, ...authorData } : auth
        )
      })),
      
      deleteAuthor: (id) => set((state) => ({
        authors: state.authors.filter(auth => auth.id !== id)
      })),
      
      // Order management
      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(order => 
          order.id === orderId 
            ? { ...order, status, updatedAt: new Date().toISOString() } 
            : order
        )
      })),
      
      // User management
      toggleUserStatus: (userId) => set((state) => ({
        users: state.users.map(user => 
          user.id === userId 
            ? { ...user, isActive: !user.isActive } 
            : user
        )
      })),
      
      // PromoCode CRUD
      addPromoCode: (promo) => set((state) => ({
        promoCodes: [...state.promoCodes, { 
          ...promo, 
          id: `promo-${Date.now()}` 
        }]
      })),
      
      updatePromoCode: (id, promoData) => set((state) => ({
        promoCodes: state.promoCodes.map(promo => 
          promo.id === id ? { ...promo, ...promoData } : promo
        )
      })),
      
      deletePromoCode: (id) => set((state) => ({
        promoCodes: state.promoCodes.filter(promo => promo.id !== id)
      })),
      
      togglePromoStatus: (id) => set((state) => ({
        promoCodes: state.promoCodes.map(promo => 
          promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
        )
      })),
    }),
    {
      name: 'bookish-admin-storage',
    }
  )
);
