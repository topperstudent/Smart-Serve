export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'cancelled';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  restaurantId: string;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  tagline?: string;
  phone?: string;
  address?: string;
  currency: string; // 'INR' default
  currencySymbol: string; // '₹' default
  taxRate: number; // percentage e.g. 5 for 5%
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number; // in INR
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: string; // e.g. "1", "2", "T-05"
  tableName: string; // e.g. "Window Booth 1"
  capacity: number;
  isActive: boolean;
  createdAt?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number; // trusted server price captured at order time
  quantity: number;
  isVeg?: boolean;
  specialInstructions?: string;
}

export interface OrderEditRecord {
  timestamp: string;
  note: string;
  previousTotal: number;
  newTotal: number;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  specialInstructions?: string;
  status: OrderStatus;
  customerTrackingToken: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  editHistory?: OrderEditRecord[];
  createdAt: string; // ISO date string
  updatedAt?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}
