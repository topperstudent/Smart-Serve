import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  ChefHat,
  X,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Utensils,
  XCircle,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Restaurant, MenuItem, RestaurantTable, Order, CartItem, OrderStatus } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { APP_CONFIG } from '../../config/appConfig';

interface CustomerViewProps {
  restaurantId: string;
  tableNumber: string;
  onGoToKitchen?: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({
  restaurantId,
  tableNumber,
  onGoToKitchen,
}) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart
  const [cart, setCart] = useState<{ [itemId: string]: CartItem }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [specialNotes, setSpecialNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active / Tracked Order
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Load restaurant, menu, and tables
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [r, items, tbls] = await Promise.all([
          restaurantService.getRestaurant(restaurantId),
          restaurantService.getMenuItems(restaurantId),
          restaurantService.getTables(restaurantId),
        ]);
        if (isMounted) {
          setRestaurant(r);
          setMenuItems(items);
          setTables(tbls);
        }
      } catch (e) {
        console.error('Failed to load menu data:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  // Find active table object by ID or tableNumber
  const currentTable = useMemo(() => {
    return tables.find((t) => t.id === tableNumber || t.tableNumber === tableNumber) || tables[0] || null;
  }, [tables, tableNumber]);

  // Subscribe to real-time status of placed order
  useEffect(() => {
    if (!activeOrder) return;
    const unsub = restaurantService.subscribeCustomerOrder(restaurantId, activeOrder.id, (updatedOrder) => {
      if (updatedOrder) {
        setActiveOrder(updatedOrder);
      }
    });
    return () => unsub();
  }, [restaurantId, activeOrder?.id]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => set.add(item.category));
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchVeg = !vegOnly || item.isVeg;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchVeg && matchSearch;
    });
  }, [menuItems, selectedCategory, vegOnly, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: {
          menuItem: item,
          quantity: newQty,
          specialInstructions: existing?.specialInstructions || '',
        },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  };

  const updateCartInstructions = (itemId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          specialInstructions: notes,
        },
      };
    });
  };

  const cartItemsList = Object.values(cart);
  const cartTotalItemsCount = cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0);

  // Client preview calculation (verified authoritatively on backend upon placement)
  const previewSubtotal = cartItemsList.reduce(
    (acc, curr) => acc + curr.menuItem.price * curr.quantity,
    0
  );
  const taxRate = restaurant?.taxRate || 5.0;
  const previewTax = Math.round((previewSubtotal * (taxRate / 100)) * 100) / 100;
  const previewTotal = Math.round((previewSubtotal + previewTax) * 100) / 100;

  // Handle Order Placement
  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0 || !currentTable) return;

    if (!currentTable.isActive) {
      setSubmitError('This dining table is currently marked inactive by staff. Please check with your server.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderPayload = {
        restaurantId,
        tableId: currentTable.id,
        cart: cartItemsList.map((c) => ({
          itemId: c.menuItem.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions,
        })),
        customerNotes: specialNotes,
      };

      const placedOrder = await restaurantService.validateAndSubmitOrder(orderPayload);
      setActiveOrder(placedOrder);
      setCart({});
      setSpecialNotes('');
      setIsCartOpen(false);
      setIsTrackingModalOpen(true);
    } catch (err) {
      console.error('Order submission failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencySym = restaurant?.currencySymbol || '₹';

  const getStatusStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return 1;
      case 'preparing':
        return 2;
      case 'ready':
        return 3;
      case 'served':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-32">
      {/* Top Dining Header */}
      <div className="bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                  Contactless Dining
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified QR Menu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {restaurant?.name || 'SmartServe Restaurant'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {restaurant?.address || 'Authentic dining freshly cooked to order.'}
              </p>
            </div>

            {/* Table Badge */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex flex-col items-center justify-center text-white font-black shadow-2xs">
                  <span className="text-[8px] uppercase tracking-wider leading-none">Table</span>
                  <span className="text-base font-black leading-none">{currentTable?.tableNumber || tableNumber}</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Seating</p>
                  <p className="text-xs font-bold text-slate-900">
                    {currentTable?.tableName || `Table ${tableNumber}`}
                  </p>
                </div>
              </div>

              {/* View active order button if order exists */}
              {activeOrder && (
                <button
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all shadow-2xs animate-pulse"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Track Order</span>
                </button>
              )}
            </div>
          </div>

          {/* Inactive Table Warning if staff marked table offline */}
          {currentTable && !currentTable.isActive && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>
                <strong>Notice:</strong> This table is currently marked inactive by staff. You can browse the menu, but ordering is paused.
              </span>
            </div>
          )}

          {/* Search Bar & Veg Filter Switch */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food by name, ingredients, or spices..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Veg Only Toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                vegOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center p-0.5 rounded-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </div>
              <span>Veg Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Category Tabs Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white shadow-xs scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Food Menu Items List - White Floating Cards */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {loading ? (
          <div className="text-center py-24">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-semibold">Preparing your table menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-2xs">
            <Utensils className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No dishes found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? `No items matching "${searchQuery}".` : 'No dishes available in this section.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {filteredItems.map((item) => {
              const inCartQty = cart[item.id]?.quantity || 0;

              return (
                <div
                  key={item.id}
                  className={`flex rounded-3xl bg-white border border-slate-200/90 overflow-hidden shadow-sm transition-all duration-200 saas-card-hover ${
                    !item.isAvailable ? 'opacity-50 grayscale' : ''
                  }`}
                >
                  {/* Dish Info */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Dietary Icon + Category */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-sm ${
                            item.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500">{item.category}</span>
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-1">{item.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description || 'Prepared fresh with signature ingredients.'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-base font-black text-slate-900 font-mono">
                        {currencySym}{item.price}
                      </span>

                      {/* Interactive Add to Cart or Stepper */}
                      {item.isAvailable ? (
                        inCartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-amber-500 text-white font-black rounded-xl px-2 py-1 shadow-xs">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono text-xs min-w-[16px] text-center font-black">
                              {inCartQty}
                            </span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-white transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 text-xs font-bold border border-slate-200 transition-all shadow-2xs active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Add</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded-lg bg-slate-100">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dish Thumbnail */}
                  <div className="w-28 sm:w-36 bg-slate-100 relative overflow-hidden flex-shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartTotalItemsCount > 0 && (
        <div className="fixed bottom-4 inset-x-0 z-40 px-4 max-w-md mx-auto">
          <div
            onClick={() => setIsCartOpen(true)}
            className="p-3 sm:p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-xl flex items-center justify-between cursor-pointer active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold text-xs shadow-2xs">
                {cartTotalItemsCount}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider leading-none text-white/90">Table {currentTable?.tableNumber || tableNumber} Order</p>
                <p className="text-sm font-black leading-tight">
                  {cartTotalItemsCount} item{cartTotalItemsCount === 1 ? '' : 's'} · {currencySym}{previewTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white text-slate-900 px-3 py-1.5 rounded-xl shadow-2xs">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
        </div>
      )}

      {/* Slide-Up Cart / Checkout Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up text-slate-900">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Your Table Order</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  Table {currentTable?.tableNumber || tableNumber}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
              {cartItemsList.map(({ menuItem, quantity, specialInstructions }) => (
                <div key={menuItem.id} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-sm ${
                            menuItem.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${menuItem.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        </div>
                        <p className="text-xs font-bold text-slate-900">{menuItem.name}</p>
                      </div>
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {currencySym}{menuItem.price} × {quantity} = {currencySym}{menuItem.price * quantity}
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1 text-xs font-bold border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => removeFromCart(menuItem.id)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-900 min-w-[14px] text-center font-mono">{quantity}</span>
                      <button
                        onClick={() => addToCart(menuItem)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction per dish */}
                  <div className="mt-2 pt-2 border-t border-slate-200/80">
                    <input
                      type="text"
                      placeholder="Special cooking notes (e.g. mild spice, extra crispy)..."
                      value={specialInstructions || ''}
                      onChange={(e) => updateCartInstructions(menuItem.id, e.target.value)}
                      className="w-full bg-white text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ))}

              {/* General Order Notes */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  General Table Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="e.g. Please bring extra napkins, all dishes served together."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Price Breakdown */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {currencySym}{previewSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxes & GST ({taxRate}%)</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {currencySym}{previewTax.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                  <span>Total Due</span>
                  <span className="text-slate-900 text-base font-mono">
                    {currencySym}{previewTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Keep Browsing
              </button>
              <button
                type="button"
                disabled={isSubmitting || cartItemsList.length === 0}
                onClick={handlePlaceOrder}
                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Send Order to Kitchen • {currencySym}{previewTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Order Tracking Modal */}
      {isTrackingModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative space-y-4 text-slate-900">
            <button
              onClick={() => setIsTrackingModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge */}
            <div className="text-center pt-2">
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs mb-3 ${
                  activeOrder.status === 'cancelled'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                }`}
              >
                {activeOrder.status === 'cancelled' ? (
                  <XCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-8 h-8" />
                )}
              </div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  activeOrder.status === 'cancelled'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {activeOrder.status === 'cancelled' ? 'Order Cancelled' : 'Live Kitchen Sync Active'}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                {activeOrder.status === 'cancelled' ? 'Order Cancelled' : 'Order Transmitted!'}
              </h3>
              <p className="text-xs font-mono font-bold text-amber-700 mt-0.5">#{activeOrder.id}</p>
              <p className="text-xs text-slate-500 mt-1">
                Table {currentTable?.tableNumber || tableNumber} · Placed at {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* If Cancelled */}
            {activeOrder.status === 'cancelled' ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                <p className="font-bold">Cancellation Reason:</p>
                <p className="italic">{activeOrder.cancellationReason || 'Cancelled by restaurant staff.'}</p>
                <p className="text-[10px] text-red-600 pt-1">
                  Please speak with your server if you have any questions.
                </p>
              </div>
            ) : (
              /* Live Kitchen Stepper */
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Preparation Progress</span>
                  <span className="text-amber-700 capitalize">{activeOrder.status}</span>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'Order Received', desc: 'Sent to kitchen display', step: 1, icon: CheckCircle2 },
                    { title: 'Cooking in Kitchen', desc: 'Chef preparing your order', step: 2, icon: Flame },
                    { title: 'Plated & Ready', desc: 'Finishing touches completed', step: 3, icon: ChefHat },
                    { title: 'Served to Table', desc: 'Delivered to your seat', step: 4, icon: Utensils },
                  ].map((s) => {
                    const currentStep = getStatusStepIndex(activeOrder.status);
                    const isCompleted = currentStep >= s.step;
                    const isCurrent = currentStep === s.step;
                    const Icon = s.icon;

                    return (
                      <div key={s.step} className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="flex-1">
                          <p className={`text-xs font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {s.title}
                          </p>
                          <p className="text-[10px] text-slate-500">{s.desc}</p>
                        </div>
                        {isCompleted && <span className="text-[10px] text-emerald-600 font-bold">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Items Summary in Modal */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              {activeOrder.items.map((i, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <span>{i.quantity}x {i.name}</span>
                  <span className="font-mono">{currencySym}{i.price * i.quantity}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total</span>
                <span className="text-amber-700 font-mono">{currencySym}{activeOrder.total}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsTrackingModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Continue Browsing Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
