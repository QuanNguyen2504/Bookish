// Types cho website Bookish

// Sách
export interface Book {
  id: string;
  title: string;
  author: Author;
  category: Category;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  publishYear: number;
  pages: number;
  isbn: string;
  featured?: boolean;
  bestseller?: boolean;
  allCategories: {
    name: string;
    slug: string;
  }[];
}

// Tác giả
export interface Author {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  bookCount: number;
  country?: string;
  createdAt?: string;
}

// Danh mục
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  bookCount: number;
  createdAt?: string;
}

// Giỏ hàng
export interface CartItem {
  book: Book;
  quantity: number;
}

// Đơn hàng
export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  promoCode?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipping' 
  | 'delivered' 
  | 'cancelled';

export type PaymentMethod = 
  | 'cod' 
  | 'bank_transfer' 
  | 'credit_card' 
  | 'momo' 
  | 'vnpay';

// Địa chỉ giao hàng
export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  note?: string;
}

// Người dùng
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  address?: ShippingAddress;
  role: 'user' | 'admin';
  createdAt: string;
  isActive?: boolean;
  lastLogin?: string;
  orderCount?: number;
  totalSpent?: number;
}

// Đánh giá
export interface Review {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Mã khuyến mãi
export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

// Chat message
export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: string;
}

// Thống kê
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalBooks: number;
  totalUsers: number;
  revenueGrowth: number;
  orderGrowth: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopBook {
  book: Book;
  soldCount: number;
}

export interface DailyOrders {
  date: string;
  orders: number;
  revenue: number;
}
