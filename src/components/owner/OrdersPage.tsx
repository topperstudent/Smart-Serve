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
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingOrder || editItems.length === 0) return;
    setIsSavingEdit(true);
    try {
      await restaurantService.editOrder({
        restaurantId: restaurant.id,
        orderId: editingOrder.id,
        updatedItems: editItems,
        editNote: editNote.trim() || 'Item quantities adjusted by staff',
      });
      setEditingOrder(null);
    } catch (err) {
      console.error('Failed to save order edits:', err);
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

  const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto" onClick={handleUnlockAudio}>
      {/* Top Banner & Voice Center */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Live Operations
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Real-Time Kitchen Feed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ChefHat className="w-8 h-8 text-amber-400" />
            Orders Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real orders placed by customers at their tables. Move tickets through preparation or cancel when necessary.
          </p>
        </div>

        {/* Audio Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTestVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 hover:bg-slate-800 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Voice Announcement</span>
          </button>

          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              isMuted
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Voice Muted' : 'Voice Alert On'}</span>
          </button>
        </div>
      </div>

      {/* Autoplay unlock notice */}
      {!audioUnlocked && (
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-slate-200">
              <strong className="text-amber-400">Audio Autoplay Ready:</strong> Click anywhere on screen or tap Enable Voice to permit spoken order alerts.
            </span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg whitespace-nowrap"
          >
            Enable Voice
          </button>
        </div>
      )}

      {/* Last Announcement Toast */}
      {lastAnnouncement && (
        <div className="mt-3 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 overflow-hidden">
            <Volume2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-slate-500 font-mono">[{lastAnnouncement.time}]</span>
            <span className="text-slate-200 font-medium truncate">"{lastAnnouncement.message}"</span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              lastAnnouncement.played
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {lastAnnouncement.played ? 'Voice Alert Played' : 'Visual Notification'}
          </span>
        </div>
      )}

      {/* Pipeline Filter Bar */}
      <div className="mt-6 flex items-center gap-2 border-b border-slate-800/80 pb-4 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span>All Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('new')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'new'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
          <span>New</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${newCount > 0 ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
            {newCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('preparing')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'preparing'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Preparing</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {prepCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('ready')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'ready'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ready to Serve</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {readyCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('served')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'served'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-slate-400" />
          <span>Served</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {servedCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('cancelled')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'cancelled'
              ? 'bg-red-500 text-white font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          <span>Cancelled</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {cancelledCount}
          </span>
        </button>
      </div>

      {/* Orders Grid / Honest Empty State */}
      <div className="mt-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No orders received yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {filter === 'all'
                ? 'Your kitchen pipeline is currently clear. When customers scan their table QR codes and order, tickets appear here instantly in real time.'
                : `No orders currently matching filter "${filter}".`}
            </p>
            {onNavigateToTables && (
              <button
                onClick={onNavigateToTables}
                className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500/20"
              >
                Go to Table QR Codes to Place a Test Order ➔
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

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl bg-slate-900 border transition-all shadow-xl overflow-hidden ${
                    isNew
                      ? 'border-orange-500/80 ring-2 ring-orange-500/30 shadow-orange-500/10'
                      : isPrep
                      ? 'border-amber-500/50'
                      : isReady
                      ? 'border-emerald-500/50'
                      : isCancelled
                      ? 'border-red-900/40 opacity-70 bg-slate-950/70'
                      : 'border-slate-800 opacity-80'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b ${
                      isNew
                        ? 'bg-gradient-to-r from-orange-950/60 to-slate-900 border-orange-500/30'
                        : isPrep
                        ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/20'
                        : isReady
                        ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/20'
                        : isCancelled
                        ? 'bg-red-950/30 border-red-900/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black ${
                          isNew
                            ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 animate-pulse'
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white">#{order.id}</span>
                          {isNew && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-orange-500 text-slate-950">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
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

                  {/* Card Items List */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-56 bg-slate-950/40">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2.5">
                          <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0">
                            {item.quantity}x
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.isVeg ? 'bg-emerald-400' : 'bg-red-400'
                                }`}
                              />
                              <span className="font-bold text-white leading-snug">{item.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ₹{item.price} each = ₹{item.price * item.quantity}
                            </span>
                            {item.specialInstructions && (
                              <p className="text-[11px] text-amber-300 italic mt-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Special Instructions callout */}
                    {order.specialInstructions && (
                      <div className="mt-2.5 p-2 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                        <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                          Table Instructions:
                        </span>
                        {order.specialInstructions}
                      </div>
                    )}

                    {/* Cancellation Information if Cancelled */}
                    {isCancelled && (
                      <div className="mt-2.5 p-2.5 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">
                        <div className="flex items-center gap-1.5 font-bold text-red-400 uppercase text-[10px]">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Order Cancelled</span>
                        </div>
                        <p className="mt-1">Reason: {order.cancellationReason || 'No reason provided'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Cancelled by: {order.cancelledBy || 'Staff'} at {order.cancelledAt ? new Date(order.cancelledAt).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    )}

                    {/* Edit history audit */}
                    {order.editHistory && order.editHistory.length > 0 && (
                      <div className="mt-2 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-400">
                        <span className="font-bold text-amber-400 block mb-0.5">Correction History:</span>
                        {order.editHistory.map((h, i) => (
                          <div key={i}>
                            • {h.note} (₹{h.previousTotal} ➔ ₹{h.newTotal})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer & Action Buttons */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-3 text-slate-400 font-medium">
                      <span>Total: <strong className="text-white text-sm">₹{order.total.toFixed(2)}</strong></span>
                      <span>{order.items.reduce((a, b) => a + b.quantity, 0)} items</span>
                    </div>

                    {/* Progression Actions */}
                    <div className="flex items-center gap-2">
                      {isNew && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                          <span>Start Preparing</span>
                        </button>
                      )}

                      {isPrep && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>Mark Ready</span>
                        </button>
                      )}

                      {isReady && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(order.id, 'served')}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Utensils className="w-4 h-4" />}
                          <span>Delivered to Table (Served)</span>
                        </button>
                      )}

                      {/* Edit Button (if not served or cancelled) */}
                      {!isServed && !isCancelled && (
                        <button
                          onClick={() => handleOpenEditModal(order)}
                          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800"
                          title="Edit Order Quantities"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Cancel Button */}
                      {!isCancelled && (
                        <button
                          onClick={() => handleOpenCancelModal(order)}
                          className="p-2.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-xl border border-red-900/40"
                          title="Cancel Order"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-white">Cancel Order #{orderToCancel.id}?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Table {orderToCancel.tableNumber} • Amount: ₹{orderToCancel.total.toFixed(2)}. Cancelling this order will mark it as cancelled, exclude it from net sales, and notify kitchen staff.
            </p>

            {/* Note about payments */}
            <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                SmartServe manages kitchen & operational orders. Cancelling does not trigger external credit card refunds unless an external gateway is attached.
              </span>
            </div>

            {/* If order is already served, require explicit confirmation checkbox */}
            {orderToCancel.status === 'served' && (
              <div className="mt-3 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300 space-y-2">
                <p className="font-bold text-red-300">
                  Warning: This order has already been marked SERVED.
                </p>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmServedCancel}
                    onChange={(e) => setConfirmServedCancel(e.target.checked)}
                    className="rounded text-red-500 focus:ring-red-500"
                  />
                  <span>I authorize correcting this served order.</span>
                </label>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Guest changed mind, kitchen out of key ingredient..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setOrderToCancel(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancelling || (orderToCancel.status === 'served' && !confirmServedCancel)}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-1">
              Adjust Order #{editingOrder.id}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Table {editingOrder.tableNumber}</p>

            <div className="space-y-3 max-h-56 overflow-y-auto">
              {editItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-amber-400 font-mono">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditItemQty(idx, -1)}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-white min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleEditItemQty(idx, 1)}
                      className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Reason for Adjustment
              </label>
              <input
                type="text"
                placeholder="e.g. Guest removed one lassi"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit || editItems.length === 0}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
