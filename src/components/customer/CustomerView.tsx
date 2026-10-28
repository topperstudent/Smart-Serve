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
} from 'lucide-react';
import { Restaurant, MenuItem, RestaurantTable, Order, CartItem, OrderStatus } from '../../types';
import { restaurantService } from '../../services/restaurantService';

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

  // Client preview calculation (authoritative calculation happens on backend)
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

      // Server-side price calculation and submission
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

  // Helper for Order Status Step
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

  const currencySym = restaurant?.currencySymbol || '₹';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28">
      {/* Restaurant Header Banner */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Contactless Dining
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified QR Menu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {restaurant?.name || 'The Spice Pavilion'}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-lg">
                {restaurant?.tagline || 'Artisanal Flavors, Fresh Ingredients & Coastal Curries'}
              </p>
              {restaurant?.address && (
                <p className="text-xs text-slate-500 mt-0.5">📍 {restaurant.address}</p>
              )}
            </div>

            {/* Table Badge Card */}
            <div className="flex items-center gap-3 bg-slate-900/90 border border-amber-500/30 p-3 rounded-2xl shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex flex-col items-center justify-center text-slate-950 font-black shadow-inner">
                <span className="text-[10px] uppercase leading-none font-bold">Table</span>
                <span className="text-lg leading-tight font-black">{currentTable?.tableNumber || tableNumber}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Your Dining Table</p>
                <p className="text-sm font-bold text-white">{currentTable?.tableName || `Table ${tableNumber}`}</p>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {currentTable?.isActive === false ? 'Table is Inactive' : 'Orders go direct to kitchen'}
                </p>
              </div>
            </div>
          </div>

          {/* Inactive Table Warning */}
          {currentTable && !currentTable.isActive && (
            <div className="mt-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>This table is currently inactive. Please check with the restaurant host before ordering.</span>
            </div>
          )}

          {/* Active Order Tracker Notification Bar */}
          {activeOrder && activeOrder.status !== 'served' && (
            <div
              onClick={() => setIsTrackingModalOpen(true)}
              className={`mt-5 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-md group ${
                activeOrder.status === 'cancelled'
                  ? 'bg-red-950/40 border-red-500/40'
                  : 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-orange-950/70 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                  activeOrder.status === 'cancelled'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {activeOrder.status === 'cancelled' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <ChefHat className="w-5 h-5 animate-bounce" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-300">Active Order #{activeOrder.id}</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full uppercase font-bold ${
                      activeOrder.status === 'cancelled'
                        ? 'bg-red-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {activeOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {activeOrder.status === 'new' && 'Order received! Kitchen is preparing...'}
                    {activeOrder.status === 'preparing' && 'Chef is cooking your fresh dishes!'}
                    {activeOrder.status === 'ready' && 'Dishes are ready! Staff is bringing them to Table ' + activeOrder.tableNumber + '.'}
                    {activeOrder.status === 'cancelled' && `Order cancelled: ${activeOrder.cancellationReason || 'Notice from staff'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                <span>View Status</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes, curries, drinks, breads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Veg-Only Toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                vegOnly
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-emerald-400' : 'bg-emerald-500/40'}`} />
              🌱 Pure Veg Only
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-sm">Fetching fresh menu from database...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800/80 p-8">
            <Utensils className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No dishes found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              We couldn't find items matching "{searchQuery}". Try selecting another category or clearing filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setVegOnly(false);
              }}
              className="mt-4 px-4 py-1.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const inCartQty = cart[item.id]?.quantity || 0;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between bg-slate-900/90 rounded-2xl border transition-all overflow-hidden ${
                    item.isAvailable
                      ? 'border-slate-800/90 hover:border-slate-700 hover:shadow-lg'
                      : 'border-slate-800/40 opacity-60 bg-slate-900/40'
                  }`}
                >
                  <div className="flex p-4 gap-3.5">
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            item.isVeg ? 'border-emerald-500' : 'border-red-500'
                          }`}
                          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          {item.category}
                        </span>
                        {!item.isAvailable && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            Sold Out
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-white text-base leading-snug">{item.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-amber-400 font-mono">
                          {currencySym}{item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Dish Image */}
                    {item.imageUrl && (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-[11px] font-bold text-white uppercase text-center px-1">
                            Sold Out
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add / Quantity Footer */}
                  <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      {inCartQty > 0 ? `${inCartQty} in cart` : item.isAvailable ? 'Available now' : 'Unavailable'}
                    </span>

                    {item.isAvailable && (
                      inCartQty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-amber-500 text-slate-950 rounded-xl px-1.5 py-0.5 font-bold shadow-sm">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 hover:bg-amber-600 rounded-lg transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs min-w-[16px] text-center font-extrabold">{inCartQty}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 hover:bg-amber-600 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartTotalItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-0 right-0 max-w-xl mx-auto px-4 z-40 animate-in slide-in-from-bottom duration-200">
          <div
            onClick={() => setIsCartOpen(true)}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 p-3.5 rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-between cursor-pointer hover:brightness-105 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  {cartTotalItemsCount} {cartTotalItemsCount === 1 ? 'Dish' : 'Dishes'} Selected
                </p>
                <p className="text-base font-black text-slate-950 font-mono">
                  {currencySym}{previewTotal.toFixed(2)}{' '}
                  <span className="text-[11px] font-semibold text-slate-800 font-sans">(incl. tax)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md">
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Your Table Order</h3>
                  <p className="text-xs text-amber-400 font-semibold">
                    Table {currentTable?.tableNumber || tableNumber} • {restaurant?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {cartItemsList.map(({ menuItem, quantity, specialInstructions }) => (
                <div key={menuItem.id} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            menuItem.isVeg ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        <h4 className="font-bold text-white text-sm">{menuItem.name}</h4>
                      </div>
                      <p className="text-xs font-semibold text-amber-400 mt-0.5 font-mono">
                        {currencySym}{(menuItem.price * quantity).toFixed(2)}{' '}
                        <span className="text-[11px] text-slate-500 font-normal font-sans">
                          ({currencySym}{menuItem.price.toFixed(2)} each)
                        </span>
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1 text-xs font-bold">
                      <button
                        onClick={() => removeFromCart(menuItem.id)}
                        className="text-slate-300 hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-amber-400 min-w-[14px] text-center">{quantity}</span>
                      <button
                        onClick={() => addToCart(menuItem)}
                        className="text-slate-300 hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction per item */}
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                    <input
                      type="text"
                      placeholder="Special request (e.g. less spicy, extra chutney)..."
                      value={specialInstructions || ''}
                      onChange={(e) => updateCartInstructions(menuItem.id, e.target.value)}
                      className="w-full bg-slate-900/90 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              ))}

              {/* General Order Notes */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  General Kitchen Instructions
                </label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  placeholder="E.g., Please bring all starters together, extra drinking glasses, no ice."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {currencySym}{previewSubtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Tax ({taxRate}%)</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {currencySym}{previewTax.toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
                  <span>Total Due</span>
                  <span className="text-amber-400 text-base font-mono">
                    {currencySym}{previewTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Prices will be verified against the official restaurant catalog on submission.
                </p>
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice: </span>
                    {submitError}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Submit */}
            <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-4 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Back to Menu
              </button>
              <button
                type="button"
                disabled={isSubmitting || cartItemsList.length === 0}
                onClick={handlePlaceOrder}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-98 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating & Sending...</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setIsTrackingModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Order Confirmation Badge */}
            <div className="text-center pt-2">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-3 ${
                activeOrder.status === 'cancelled'
                  ? 'bg-red-500/20 text-red-400 shadow-red-500/20'
                  : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
              }`}>
                {activeOrder.status === 'cancelled' ? (
                  <XCircle className="w-8 h-8 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-8 h-8" />
                )}
              </div>
              <span className={`text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                activeOrder.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {activeOrder.status === 'cancelled' ? 'Order Cancelled' : 'Live Kitchen Link Active'}
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {activeOrder.status === 'cancelled' ? 'Order Cancelled' : 'Order Confirmed!'}
              </h3>
              <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">#{activeOrder.id}</p>
              <p className="text-xs text-slate-400 mt-1">
                Seated at Table {activeOrder.tableNumber} • Placed {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Real-Time Stepper Progress Bar */}
            <div className="mt-6 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold mb-4">
                <span className="text-slate-400">Current Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full uppercase text-[10px] ${
                  activeOrder.status === 'cancelled'
                    ? 'bg-red-500 text-white'
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  {activeOrder.status}
                </span>
              </div>

              {activeOrder.status === 'cancelled' ? (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
                  <p className="font-bold">Cancellation Reason:</p>
                  <p className="mt-0.5">{activeOrder.cancellationReason || 'Cancelled by restaurant staff'}</p>
                </div>
              ) : (
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-2 right-2 top-3.5 h-1 bg-slate-800 -z-0">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{
                        width: `${((getStatusStepIndex(activeOrder.status) - 1) / 3) * 100}%`,
                      }}
                    />
                  </div>

                  {[
                    { key: 'new', label: 'Received', icon: Clock },
                    { key: 'preparing', label: 'Cooking', icon: Flame },
                    { key: 'ready', label: 'Ready', icon: ChefHat },
                    { key: 'served', label: 'Served', icon: Utensils },
                  ].map((step, idx) => {
                    const stepNum = idx + 1;
                    const currentNum = getStatusStepIndex(activeOrder.status);
                    const isDone = currentNum >= stepNum;
                    const isCurrent = currentNum === stepNum;
                    const Icon = step.icon;

                    return (
                      <div key={step.key} className="flex flex-col items-center z-10">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-500'
                          } ${isCurrent ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-[10px] mt-2 font-bold tracking-tight ${
                            isDone ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status explanation */}
              <p className="text-xs text-center text-slate-300 mt-5 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                {activeOrder.status === 'new' && '✨ Your order is registered on the kitchen display. Cooking begins momentarily.'}
                {activeOrder.status === 'preparing' && '🔥 Chef is preparing your dishes right now with fresh ingredients.'}
                {activeOrder.status === 'ready' && '🔔 Your dishes are hot & ready! Restaurant staff is bringing them to Table ' + activeOrder.tableNumber + '.'}
                {activeOrder.status === 'served' && '🍽️ Served! Enjoy your delicious meal at ' + restaurant?.name + '!'}
                {activeOrder.status === 'cancelled' && '⚠️ This order was cancelled. Please speak with your server.'}
              </p>
            </div>

            {/* Order Items Summary */}
            <div className="mt-4 max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {activeOrder.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-slate-300 py-1 border-b border-slate-800/60">
                  <span>
                    <strong className="text-white">{i.quantity}x</strong> {i.name}
                  </span>
                  <span className="font-mono text-slate-400">
                    {currencySym}{(i.price * i.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-extrabold text-white pt-1">
                <span>Total:</span>
                <span className="text-amber-400 font-mono text-sm">
                  {currencySym}{activeOrder.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2">
              {onGoToKitchen && (
                <button
                  onClick={() => {
                    setIsTrackingModalOpen(false);
                    onGoToKitchen();
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  <span>Switch to Kitchen View (Watch Status Live)</span>
                </button>
              )}
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold py-2.5 rounded-xl transition-all"
              >
                Back to Menu / Order More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
