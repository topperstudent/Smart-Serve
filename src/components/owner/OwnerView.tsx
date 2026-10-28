import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  QrCode,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  ExternalLink,
  Save,
  RefreshCw,
  LogOut,
  LogIn,
  CheckCircle2,
  Sparkles,
  Utensils,
  Layers,
  Settings,
  Clock,
  Printer,
  Eye,
  AlertCircle,
  Database,
} from 'lucide-react';
import { Restaurant, MenuItem, RestaurantTable, Order } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { auth, googleProvider, signInWithPopup, fbSignOut, onAuthStateChanged, User } from '../../firebase/config';
import { PrintableTableCard } from './PrintableTableCard';

interface OwnerViewProps {
  restaurantId: string;
  onOpenKitchen: () => void;
  onOpenCustomerTable: (tableNumber: string) => void;
}

export const OwnerView: React.FC<OwnerViewProps> = ({
  restaurantId,
  onOpenKitchen,
  onOpenCustomerTable,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'menu' | 'tables' | 'history' | 'settings'>('analytics');
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [previewingTable, setPreviewingTable] = useState<RestaurantTable | null>(null);

  // New item form state
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
    name: '',
    category: 'Main Course',
    price: 12.0,
    description: '',
    isVeg: true,
    isAvailable: true,
    imageUrl: '',
  });

  // Table form state
  const [tableForm, setTableForm] = useState<Partial<RestaurantTable>>({
    tableNumber: '',
    tableName: '',
    capacity: 4,
    isActive: true,
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<Partial<Restaurant>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Load all restaurant data
  const refreshData = async () => {
    setLoading(true);
    try {
      const [r, items, tbls] = await Promise.all([
        restaurantService.getRestaurant(restaurantId),
        restaurantService.getMenuItems(restaurantId),
        restaurantService.getTables(restaurantId),
      ]);
      setRestaurant(r);
      if (r) setSettingsForm(r);
      setMenuItems(items);
      setTables(tbls);
    } catch (e) {
      console.error('Failed to load owner data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const unsub = restaurantService.subscribeOrders(restaurantId, (liveOrders) => {
      setOrders(liveOrders);
    });
    return () => unsub();
  }, [restaurantId]);

  // Auth actions
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsDemoUser(false);
    } catch (err) {
      console.warn('Google popup auth issue or blocked:', err);
      // Fallback to demo login if popup is blocked by iframe
      setIsDemoUser(true);
    }
  };

  const handleDemoSignIn = () => {
    setIsDemoUser(true);
  };

  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setIsDemoUser(false);
  };

  // Menu item actions
  const handleOpenAddItem = () => {
    setItemForm({
      name: '',
      category: 'Main Course',
      price: 12.0,
      description: '',
      isVeg: true,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    });
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({ ...item });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) return;

    const itemId = editingItem ? editingItem.id : `item-${Date.now()}`;
    const payload: MenuItem = {
      id: itemId,
      restaurantId,
      name: itemForm.name,
      description: itemForm.description || '',
      price: Number(itemForm.price),
      category: itemForm.category || 'Main Course',
      isVeg: Boolean(itemForm.isVeg),
      isAvailable: itemForm.isAvailable !== undefined ? itemForm.isAvailable : true,
      imageUrl: itemForm.imageUrl || '',
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await restaurantService.saveMenuItem(restaurantId, payload);
    setIsItemModalOpen(false);
    refreshData();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await restaurantService.deleteMenuItem(restaurantId, itemId);
      refreshData();
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    await restaurantService.saveMenuItem(restaurantId, updated);
    refreshData();
  };

  // Table actions
  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.tableNumber) return;

    const tableId = `table-${Date.now()}`;
    const payload: RestaurantTable = {
      id: tableId,
      restaurantId,
      tableNumber: tableForm.tableNumber,
      tableName: tableForm.tableName || `Table ${tableForm.tableNumber}`,
      capacity: Number(tableForm.capacity || 4),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await restaurantService.saveTable(restaurantId, payload);
    setIsTableModalOpen(false);
    setTableForm({ tableNumber: '', tableName: '', capacity: 4, isActive: true });
    refreshData();
  };

  const handleDeleteTable = async (tableId: string) => {
    if (confirm('Delete this table?')) {
      await restaurantService.deleteTable(restaurantId, tableId);
      refreshData();
    }
  };

  // Settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setIsSavingSettings(true);
    try {
      const updated: Restaurant = {
        ...restaurant,
        name: settingsForm.name || restaurant.name,
        tagline: settingsForm.tagline || '',
        phone: settingsForm.phone || '',
        address: settingsForm.address || '',
        currency: settingsForm.currency || 'USD',
        currencySymbol: settingsForm.currencySymbol || '$',
        taxRate: Number(settingsForm.taxRate || 0),
        updatedAt: new Date().toISOString(),
      };
      await restaurantService.updateRestaurant(updated);
      setRestaurant(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Seed demo data into Firestore
  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedSuccess(false);
    try {
      const ownerId = user?.uid || 'demo-owner-123';
      await restaurantService.seedFirestoreDemoData(ownerId);
      setSeedSuccess(true);
      await refreshData();
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to seed demo data:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  // Analytics Computations
  const analytics = useMemo(() => {
    const totalSales = orders.reduce((acc, curr) => acc + curr.total, 0);
    const completedOrders = orders.filter((o) => o.status === 'served');
    const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0;

    // Item popularity count
    const itemMap: { [name: string]: { count: number; revenue: number } } = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = { count: 0, revenue: 0 };
        }
        itemMap[item.name].count += item.quantity;
        itemMap[item.name].revenue += item.price * item.quantity;
      });
    });

    const popularDishes = Object.entries(itemMap)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSales,
      totalOrders: orders.length,
      avgOrderValue,
      completedOrdersCount: completedOrders.length,
      popularDishes,
    };
  }, [orders]);

  const isAuthenticated = Boolean(user || isDemoUser);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Top Owner Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Restaurant Manager
            </span>
            <span className="text-xs text-slate-400">
              {restaurant?.name || 'SmartServe Management'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Owner Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage menus, generate QR codes, view real-time sales and launch kitchen display.
          </p>
        </div>

        {/* User Auth Info & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenKitchen}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10"
          >
            <Utensils className="w-4 h-4" />
            <span>Launch Kitchen KDS</span>
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 pr-3 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-xs text-slate-950">
                {user?.displayName ? user.displayName[0] : 'O'}
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-white truncate max-w-[120px]">
                  {user?.displayName || (isDemoUser ? 'Demo Owner' : 'Owner')}
                </p>
                <p className="text-[10px] text-emerald-400">Authenticated</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 text-slate-400 hover:text-red-400 p-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Sign-In</span>
              </button>
              <button
                onClick={handleDemoSignIn}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30"
              >
                1-Click Demo Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        {[
          { key: 'analytics', label: 'Overview & Sales', icon: TrendingUp },
          { key: 'menu', label: `Menu Items (${menuItems.length})`, icon: Utensils },
          { key: 'tables', label: `Tables & QR Codes (${tables.length})`, icon: QrCode },
          { key: 'history', label: `Order History (${orders.length})`, icon: Clock },
          { key: 'settings', label: 'Restaurant Setup', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as typeof activeSubTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto mt-6">
        {/* 1. Analytics & Overview Tab */}
        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            {/* Seed Demo Callout Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-orange-950/60 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    Seed Live Demo Restaurant to Firestore
                    <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500 text-slate-950 font-bold uppercase">
                      One-Click
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Populates The Spice Pavilion menu dishes, 6 dining tables, and sample orders directly into your Firestore project.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all whitespace-nowrap"
              >
                {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSeeding ? 'Writing to Firestore...' : 'Seed Data Now'}</span>
              </button>
            </div>

            {seedSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Demo restaurant profile, 11 menu dishes, 6 tables, and orders seeded into Firestore!</span>
              </div>
            )}

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Sales Volume</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mt-2">
                  {restaurant?.currencySymbol || '$'}
                  {analytics.totalSales.toFixed(2)}
                </h3>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  Calculated from live orders
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Orders Placed</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mt-2">{analytics.totalOrders}</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  {analytics.completedOrdersCount} served & finalized
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Average Ticket Size</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mt-2">
                  {restaurant?.currencySymbol || '$'}
                  {analytics.avgOrderValue.toFixed(2)}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Per table order ticket</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Dining Tables Active</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white mt-2">{tables.length}</h3>
                <p className="text-[11px] text-slate-400 mt-1">Ready with QR code stands</p>
              </div>
            </div>

            {/* Popular Dishes & Order Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Popular Dishes */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <h4 className="font-extrabold text-sm text-white mb-4 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-400" />
                  Top Selling Dishes
                </h4>
                {analytics.popularDishes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No dishes ordered yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.popularDishes.map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white">{d.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-400">{d.count} ordered</span>
                          <span className="text-slate-500 ml-2">(${d.revenue.toFixed(2)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Order Status Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
                <h4 className="font-extrabold text-sm text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Order Pipeline Status
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-orange-500/30">
                    <span className="text-slate-400">New / Uncooked</span>
                    <p className="text-xl font-black text-orange-400 mt-1">
                      {orders.filter((o) => o.status === 'new').length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30">
                    <span className="text-slate-400">Cooking (In Prep)</span>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {orders.filter((o) => o.status === 'preparing').length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30">
                    <span className="text-slate-400">Ready to Serve</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {orders.filter((o) => o.status === 'ready').length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Served & Completed</span>
                    <p className="text-xl font-black text-slate-300 mt-1">
                      {orders.filter((o) => o.status === 'served').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Menu Management Tab */}
        {activeSubTab === 'menu' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-white">Menu Catalog</h3>
                <p className="text-xs text-slate-400">Add dishes, set prices, mark in-stock or out-of-stock.</p>
              </div>
              <button
                onClick={handleOpenAddItem}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Food Item</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.isVeg ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isAvailable
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-base mt-1.5 leading-snug">{item.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-base font-extrabold text-amber-400">
                        {restaurant?.currencySymbol || '$'}
                        {item.price.toFixed(2)}
                      </span>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleItemAvailability(item)}
                      className={`text-[11px] font-semibold underline ${
                        item.isAvailable ? 'text-slate-400 hover:text-amber-400' : 'text-emerald-400 hover:text-emerald-300'
                      }`}
                    >
                      {item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Tables & QR Code Generator Tab */}
        {activeSubTab === 'tables' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-white">Dining Tables & QR Code Generator</h3>
                <p className="text-xs text-slate-400">
                  Every table has a unique QR code link. Customers scan with their phone camera to view menu and order.
                </p>
              </div>
              <button
                onClick={() => setIsTableModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dining Table</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.map((table) => {
                const tableUrl = `${window.location.origin}/?view=customer&restaurant=${encodeURIComponent(
                  restaurantId
                )}&table=${encodeURIComponent(table.tableNumber)}`;

                return (
                  <div
                    key={table.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex flex-col items-center justify-center font-black">
                          <span className="text-[9px] uppercase font-bold leading-none">Table</span>
                          <span className="text-xl leading-tight font-black">{table.tableNumber}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Capacity: {table.capacity} Guests
                        </span>
                      </div>

                      <h4 className="font-extrabold text-white text-base">{table.tableName}</h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                        ID: {table.id}
                      </p>

                      <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <p className="text-slate-400 font-medium">Customer Scan URL:</p>
                        <p className="text-amber-400 font-mono text-[11px] truncate mt-0.5">
                          {tableUrl}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => setPreviewingTable(table)}
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Stand Card</span>
                      </button>

                      <button
                        onClick={() => onOpenCustomerTable(table.tableNumber)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1"
                        title="Simulate Customer Scanning this QR"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Open</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Order History Tab */}
        {activeSubTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-extrabold text-lg text-white">Full Order Log</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Table</th>
                      <th className="p-3.5">Items</th>
                      <th className="p-3.5">Total</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-white">#{o.id}</td>
                        <td className="p-3.5 font-bold text-amber-400">Table {o.tableNumber}</td>
                        <td className="p-3.5">
                          {o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </td>
                        <td className="p-3.5 font-bold text-white">
                          {restaurant?.currencySymbol || '$'}
                          {o.total.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-bold ${
                              o.status === 'served'
                                ? 'bg-slate-800 text-slate-300'
                                : o.status === 'ready'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(o.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. Restaurant Settings Tab */}
        {activeSubTab === 'settings' && (
          <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-extrabold text-lg text-white mb-4">Restaurant Profile & Currency Setup</h3>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={settingsForm.name || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={settingsForm.tagline || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={settingsForm.phone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settingsForm.taxRate || 0}
                    onChange={(e) => setSettingsForm({ ...settingsForm, taxRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={settingsForm.currency || 'USD'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={settingsForm.currencySymbol || '$'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={settingsForm.address || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {settingsSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Restaurant profile updated successfully!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {isSavingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Add / Edit Menu Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-extrabold text-lg text-white mb-4">
              {editingItem ? 'Edit Menu Dish' : 'Add New Food Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tandoori Paneer Tikka"
                  value={itemForm.name || ''}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                  <select
                    value={itemForm.category || 'Main Course'}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Breads">Breads</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.price || ''}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, preparation style, allergen notes..."
                  value={itemForm.description || ''}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={itemForm.imageUrl || ''}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={itemForm.isVeg}
                    onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>🌱 Vegetarian Dish</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>In Stock</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-extrabold text-lg text-white mb-4">Add Dining Table</h3>
            <form onSubmit={handleSaveTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Table Number / Code</label>
                <input
                  type="text"
                  placeholder="e.g. 7, 8, VIP-1"
                  value={tableForm.tableNumber || ''}
                  onChange={(e) => setTableForm({ ...tableForm, tableNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Friendly Table Name</label>
                <input
                  type="text"
                  placeholder="e.g. Patio Corner Booth"
                  value={tableForm.tableName || ''}
                  onChange={(e) => setTableForm({ ...tableForm, tableName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={tableForm.capacity || 4}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md"
                >
                  Create Table & QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Table Card Modal */}
      {previewingTable && restaurant && (
        <PrintableTableCard
          restaurant={restaurant}
          table={previewingTable}
          onClose={() => setPreviewingTable(null)}
        />
      )}
    </div>
  );
};
