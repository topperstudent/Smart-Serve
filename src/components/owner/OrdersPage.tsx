import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  Clock,
  Flame,
  CheckCircle2,
  Utensils,
  XCircle,
  AlertTriangle,
  Play,
  Volume2,
  VolumeX,
  RefreshCw,
  Edit2,
  Minus,
  Plus,
  Trash2,
  Bell,
  Sparkles,
  Info,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { Order, OrderStatus, OrderItem, Restaurant } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { soundService } from '../../services/soundService';

interface OrdersPageProps {
  restaurant: Restaurant;
  userEmail?: string;
  onNavigateToTables?: () => void;
  onOpenCustomerMenu?: (tableNumber: string) => void;
}

// Elapsed time formatter with live minute computation
function formatElapsedTime(createdAt: string | number): { text: string; minutes: number; isUrgent: boolean } {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return { text: 'Just now', minutes: 0, isUrgent: false };
  if (minutes < 60) return { text: `${minutes}m ago`, minutes, isUrgent: minutes >= 15 };
  const hours = Math.floor(minutes / 60);
  return { text: `${hours}h ${minutes % 60}m ago`, minutes, isUrgent: true };
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  restaurant,
  userEmail,
  onNavigateToTables,
  onOpenCustomerMenu,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'preparing' | 'ready' | 'served' | 'cancelled'>('all');
  const [isMuted, setIsMuted] = useState(soundService.getIsMuted());
  const [audioUnlocked, setAudioUnlocked] = useState(soundService.getIsAudioUnlocked());
  const [lastAnnouncement, setLastAnnouncement] = useState<{ message: string; played: boolean; time: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Live timer tick every 30 seconds for accurate elapsed time display
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Cancellation modal state
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmServedCancel, setConfirmServedCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Edit order modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Track initial load to prevent re-announcing historical orders
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const unsub = restaurantService.subscribeOrders(restaurant.id, (liveOrders) => {
      if (isInitialLoadRef.current) {
        soundService.markInitialOrdersAsAnnounced(liveOrders);
        isInitialLoadRef.current = false;
        setOrders(liveOrders);
        return;
      }

      // Voice alert for genuinely new arrivals
      liveOrders.forEach((order) => {
        if (order.status === 'new') {
          const result = soundService.announceNewOrder(order);
          if (result.message && (result.played || result.blockedReason)) {
            setLastAnnouncement({
              message: result.message,
              played: result.played,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            });
          }
        }
      });

      setOrders(liveOrders);
    });

    return () => unsub();
  }, [restaurant.id]);

  const handleUnlockAudio = () => {
    soundService.unlockAudio();
    setAudioUnlocked(true);
  };

  const handleToggleMute = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  const handleTestVoice = () => {
    handleUnlockAudio();
    const result = soundService.testVoiceAlert();
    setLastAnnouncement({
      message: result.message,
      played: result.played,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  // Status transitions
  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await restaurantService.updateOrderStatus(restaurant.id, orderId, nextStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Open cancellation modal
  const handleOpenCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setCancellationReason('');
    setConfirmServedCancel(false);
  };

  // Confirm cancellation
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setIsCancelling(true);
    try {
      await restaurantService.cancelOrder({
        restaurantId: restaurant.id,
        orderId: orderToCancel.id,
        cancellationReason: cancellationReason.trim() || 'Cancelled by restaurant staff',
        cancelledBy: userEmail || 'Staff',
      });
      setOrderToCancel(null);
    } catch (err) {
      console.error('Cancellation failed:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Open Edit Order modal
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditItems(order.items.map((i) => ({ ...i })));
    setEditNote('');
  };

  // Modify quantity in edit modal
  const handleEditItemQty = (index: number, delta: number) => {
    setEditItems((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  // Save modified order
  const handleSaveOrderEdit = async () => {
    if (!editingOrder) return;
    if (editItems.length === 0) {
      alert('Order must contain at least one item. To cancel the ticket, use Cancel Order.');
      return;
    }
    setIsSavingEdit(true);
    try {
      await restaurantService.editOrder({
        restaurantId: restaurant.id,
        orderId: editingOrder.id,
        updatedItems: editItems,
        editNote: editNote.trim() || 'Staff adjusted quantities',
      });
      setEditingOrder(null);
    } catch (e) {
      console.error('Failed to save order edit:', e);
      alert('Failed to save order modification.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Counts
  const newCount = orders.filter((o) => o.status === 'new').length;
  const prepCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const servedCount = orders.filter((o) => o.status === 'served').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const activeCount = newCount + prepCount + readyCount;

  // Filtered orders list (sorted: newest first)
  const filteredOrders = orders
    .filter((o) => {
      if (filter === 'all') return true;
      return o.status === filter;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Edit modal calculated total
  const editModalTotal = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 p-4 sm:p-6 lg:p-8" onClick={handleUnlockAudio}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Industry Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Live Kitchen Pipeline
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400 font-medium">
                {activeCount} active ticket{activeCount === 1 ? '' : 's'} in progress
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Orders Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time Firestore listener with browser speech announcements and audit tracking.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl px-3.5 py-2 flex items-center gap-3 shadow-md">
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Kitchen Queue</p>
                <p className="text-sm font-black text-amber-400">{newCount + prepCount} in Prep</p>
              </div>
              <div className="h-6 w-px bg-white/[0.08]" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Ready to Serve</p>
                <p className="text-sm font-black text-emerald-400">{readyCount} Plated</p>
              </div>
            </div>

            <button
              onClick={handleTestVoice}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-white/[0.1] hover:border-amber-500/50 text-amber-400 hover:bg-slate-800 transition-all shadow-sm"
              title="Click to test the speech synthesis announcement"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Voice</span>
            </button>

            <button
              onClick={handleToggleMute}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Muted' : 'Voice Alert On'}</span>
            </button>
          </div>
        </div>

        {/* Autoplay unlock notice if browser requires user gesture */}
        {!audioUnlocked && (
          <div className="p-3.5 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-slate-200">
                <strong className="text-amber-400">Browser Audio Standby:</strong> Tap anywhere on this screen or click Enable to activate spoken ticket announcements for incoming orders.
              </span>
            </div>
            <button
              onClick={handleUnlockAudio}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl whitespace-nowrap shadow-md text-xs"
            >
              Enable Voice
            </button>
          </div>
        )}

        {/* Recent announcement audit bar */}
        {lastAnnouncement && (
          <div className="p-2.5 bg-slate-900/90 border border-white/[0.08] rounded-xl flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Volume2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-slate-500 font-mono text-[11px]">[{lastAnnouncement.time}]</span>
              <span className="text-slate-200 font-medium truncate">"{lastAnnouncement.message}"</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lastAnnouncement.played
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {lastAnnouncement.played ? 'Audio Broadcast' : 'Visual Trigger'}
            </span>
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span>All Tickets</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filter === 'all' ? 'bg-slate-950 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setFilter('new')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'new'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            <span>New Orders</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${newCount > 0 ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
              {newCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('preparing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'preparing'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Cooking</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {prepCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('ready')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'ready'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ready to Serve</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {readyCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('served')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'served'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Served</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {servedCount}
            </span>
          </button>

          <button
            onClick={() => setFilter('cancelled')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              filter === 'cancelled'
                ? 'bg-red-500 text-white font-bold'
                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
            {cancelledCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800/40">
                {cancelledCount}
              </span>
            )}
          </button>
        </div>

        {/* Orders Grid */}
        <div>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.08] p-8 max-w-2xl mx-auto shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-amber-400">
                <ChefHat className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No tickets in this section</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filter === 'all'
                  ? 'Your kitchen queue is clear. When guests scan table QR codes and submit orders, tickets will arrive in real time.'
                  : `Currently no orders matching filter "${filter}".`}
              </p>
              {onNavigateToTables && (
                <button
                  onClick={onNavigateToTables}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-bold rounded-xl hover:opacity-95 shadow-md shadow-amber-500/20"
                >
                  <span>Open Table QR Codes to Place a Test Order</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOrders.map((order) => {
                const isNew = order.status === 'new';
                const isPrep = order.status === 'preparing';
                const isReady = order.status === 'ready';
                const isServed = order.status === 'served';
                const isCancelled = order.status === 'cancelled';
                const isUpdating = updatingOrderId === order.id;

                const elapsed = formatElapsedTime(order.createdAt);
                const isDelayed = !isServed && !isCancelled && elapsed.isUrgent;

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col justify-between rounded-2xl bg-[#0F172A] border transition-all duration-200 shadow-xl overflow-hidden glass-card-hover ${
                      isNew
                        ? 'border-orange-500/80 ring-2 ring-orange-500/30 shadow-orange-500/10'
                        : isDelayed
                        ? 'border-red-500/70 ring-2 ring-red-500/20 shadow-red-500/10'
                        : isPrep
                        ? 'border-amber-500/40 shadow-amber-500/5'
                        : isReady
                        ? 'border-emerald-500/50 shadow-emerald-500/5'
                        : isCancelled
                        ? 'border-red-900/30 opacity-70 bg-slate-950/80'
                        : 'border-white/[0.08] opacity-85'
                    }`}
                  >
                    {/* Ticket Header */}
                    <div
                      className={`p-4 flex items-center justify-between border-b ${
                        isNew
                          ? 'bg-gradient-to-r from-orange-950/60 via-slate-900 to-slate-900 border-orange-500/30'
                          : isDelayed
                          ? 'bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border-red-500/30'
                          : isPrep
                          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/20'
                          : isReady
                          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/20'
                          : isCancelled
                          ? 'bg-red-950/30 border-red-900/30'
                          : 'bg-slate-950 border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black shadow-md ${
                            isNew
                              ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 animate-pulse'
                              : isDelayed
                              ? 'bg-red-500 text-white'
                              : isPrep
                              ? 'bg-amber-500 text-slate-950'
                              : isReady
                              ? 'bg-emerald-500 text-slate-950'
                              : isCancelled
                              ? 'bg-red-900/40 text-red-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-extrabold leading-none">Table</span>
                          <span className="text-lg leading-tight font-black">{order.tableNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-white tracking-wide">#{order.id}</span>
                            {isNew && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-slate-950 shadow-sm animate-bounce">
                                NEW
                              </span>
                            )}
                            {isDelayed && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1 shadow-sm">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {elapsed.minutes}m Delay
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                            <span>·</span>
                            <span className={isDelayed ? 'text-red-400 font-bold' : 'text-slate-400'}>
                              {elapsed.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status indicator tag */}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isNew
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : isPrep
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : isReady
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : isCancelled
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Ticket Items List */}
                    <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-56 bg-slate-950/50">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 text-sm pb-2.5 border-b border-white/[0.05] last:border-0 last:pb-0">
                          <div className="flex items-start gap-2.5">
                            {/* Quantity pill */}
                            <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                              {item.quantity}x
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {/* Indian Veg / Non-Veg square badge with inner circle */}
                                <div
                                  className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-sm flex-shrink-0 ${
                                    item.isVeg ? 'border-emerald-500' : 'border-red-500'
                                  }`}
                                  title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>
                                <span className="font-bold text-white leading-snug">{item.name}</span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                              </span>
                              {item.specialInstructions && (
                                <p className="text-[11px] text-amber-300 italic mt-0.5 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  Note: {item.specialInstructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Guest General Order Note */}
                      {order.specialInstructions && (
                        <div className="mt-2.5 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                          <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                            Table Special Request:
                          </span>
                          {order.specialInstructions}
                        </div>
                      )}

                      {/* Cancellation reason audit box */}
                      {isCancelled && (
                        <div className="mt-2 p-2.5 bg-red-950/40 border border-red-900/40 rounded-xl text-xs text-red-300">
                          <div className="flex items-center gap-1 font-bold text-red-400 mb-0.5">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Cancelled Ticket Audit</span>
                          </div>
                          <p>Reason: {order.cancellationReason || 'Staff cancelled'}</p>
                          <p className="text-[10px] text-red-400/80 mt-1">
                            By: {order.cancelledBy || 'Staff'} · {order.cancelledAt ? new Date(order.cancelledAt).toLocaleTimeString() : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer & Progression Controls */}
                    <div className="p-4 bg-slate-950 border-t border-white/[0.08]">
                      <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
                        <span className="font-semibold text-white">
                          Total: <strong className="text-amber-400 font-mono text-sm">₹{order.total}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {/* Edit order items */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenEditModal(order)}
                              className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors"
                              title="Edit items or adjust quantities"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel ticket */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenCancelModal(order)}
                              className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition-colors"
                              title="Cancel this order ticket"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progressive workflow buttons */}
                      {isNew && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                          <span>Accept & Start Cooking</span>
                        </button>
                      )}

                      {isPrep && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>Mark Plated & Ready to Serve</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'served')}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/[0.1] font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Utensils className="w-4 h-4 text-emerald-400" />}
                          <span>Delivered to Table (Mark Served)</span>
                        </button>
                      )}

                      {isServed && (
                        <div className="w-full text-center text-xs font-semibold text-slate-400 py-1 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Fulfilled & Served</span>
                        </div>
                      )}

                      {isCancelled && (
                        <div className="w-full text-center text-xs font-semibold text-red-400 py-1 flex items-center justify-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span>Order Cancelled</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/[0.12] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base text-white">Cancel Order #{orderToCancel.id}</h3>
              </div>
              <button
                onClick={() => setOrderToCancel(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Cancelling an order deducts its value from net sales in Analytics and logs an audit record with your reason.
            </p>

            {/* If order is already served, require secondary confirmation */}
            {orderToCancel.status === 'served' && (
              <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-xl text-xs text-amber-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Warning: Order already marked as Served
                </p>
                <p className="text-[11px] text-slate-300">
                  This order was already delivered to Table {orderToCancel.tableNumber}. Are you sure you wish to void or refund it?
                </p>
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmServedCancel}
                    onChange={(e) => setConfirmServedCancel(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-xs font-semibold text-white">
                    I confirm voiding this served order
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Select or Enter Cancellation Reason:
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[
                  'Customer Changed Mind',
                  'Item Out of Stock',
                  'Duplicate Order Ticket',
                  'Customer Left Table',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancellationReason(reason)}
                    className={`text-[11px] p-2 rounded-xl text-left border transition-all ${
                      cancellationReason === reason
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-900 border-white/[0.08] text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Or type custom reason for the audit log..."
                className="w-full bg-slate-900 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none h-20"
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling || (orderToCancel.status === 'served' && !confirmServedCancel)}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
              >
                {isCancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/[0.12] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  Edit Ticket #{editingOrder.id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Table {editingOrder.tableNumber} · Adjust quantities or remove items
                </p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* If editing an order that was served */}
            {editingOrder.status === 'served' && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Notice: Modifying an already served order will recalculate total revenue in reports.</span>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-950/60 p-3 rounded-2xl border border-white/[0.06]">
              {editItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-900 border border-white/[0.06]"
                >
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white leading-tight">{item.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">₹{item.price} each</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditItemQty(index, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-bold text-amber-400">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditItemQty(index, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== index))}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors ml-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Modification Note / Reason:
              </label>
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="e.g. Guest removed one soup, added dessert"
                className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Recalculated Total</p>
                <p className="text-base font-black text-amber-400 font-mono">₹{editModalTotal}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit || editItems.length === 0}
                  onClick={handleSaveOrderEdit}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Modifications</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
