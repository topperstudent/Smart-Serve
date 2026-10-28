import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  Volume2,
  VolumeX,
  Clock,
  Flame,
  CheckCircle2,
  Utensils,
  AlertTriangle,
  Play,
  Check,
  RefreshCw,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { soundService } from '../../services/soundService';

interface KitchenViewProps {
  restaurantId: string;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ restaurantId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'active' | 'new' | 'preparing' | 'ready' | 'served'>('active');
  const [isMuted, setIsMuted] = useState(soundService.getIsMuted());
  const [audioUnlocked, setAudioUnlocked] = useState(soundService.getIsAudioUnlocked());
  const [lastAnnouncement, setLastAnnouncement] = useState<{ message: string; played: boolean; time: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Track if initial load is done so we do not announce old orders on refresh
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Subscribe to live orders via Firestore snapshot / real-time updates
    const unsubscribe = restaurantService.subscribeOrders(restaurantId, (liveOrders) => {
      // First load: seed soundService with existing order IDs so they are never announced as "new"
      if (isInitialLoadRef.current) {
        soundService.markInitialOrdersAsAnnounced(liveOrders);
        isInitialLoadRef.current = false;
        setOrders(liveOrders);
        return;
      }

      // Detect genuinely newly arrived orders that have status === 'new'
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

    return () => unsubscribe();
  }, [restaurantId]);

  // Audio unlock helper
  const handleUnlockAudio = () => {
    soundService.unlockAudio();
    setAudioUnlocked(true);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  // Test Speech Announcement
  const handleTestVoice = () => {
    handleUnlockAudio();
    const result = soundService.testVoiceAlert();
    setLastAnnouncement({
      message: result.message,
      played: result.played,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  // Status transition handlers
  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await restaurantService.updateOrderStatus(restaurantId, orderId, nextStatus);
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Counts
  const newCount = orders.filter((o) => o.status === 'new').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const activeCount = newCount + preparingCount + readyCount;

  // Filter orders
  const displayedOrders = orders.filter((o) => {
    if (filter === 'active') return o.status === 'new' || o.status === 'preparing' || o.status === 'ready';
    return o.status === filter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8" onClick={handleUnlockAudio}>
      {/* KDS Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Kitchen Display System (KDS)
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Order Stream Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-400" />
            Kitchen Order Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Incoming orders from table QR codes appear here in real time with audio announcements.
          </p>
        </div>

        {/* Audio & Control Center */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTestVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 hover:bg-slate-800 transition-all"
            title="Click to preview the voice announcement"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Voice Alert</span>
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
            <span>{isMuted ? 'Voice Muted' : 'Voice Enabled'}</span>
          </button>
        </div>
      </div>

      {/* Browser Autoplay Notice / Unlock Banner */}
      {!audioUnlocked && (
        <div className="max-w-7xl mx-auto mt-4 p-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-slate-200">
              <strong className="text-amber-400">Audio Autoplay Ready:</strong> Click anywhere on the screen or tap the button to enable automatic spoken order alerts.
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

      {/* Last Announcement Status Bar */}
      {lastAnnouncement && (
        <div className="max-w-7xl mx-auto mt-3 p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
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
            {lastAnnouncement.played ? 'Voice Played' : 'Visual Notification'}
          </span>
        </div>
      )}

      {/* Filter Tabs & Counters */}
      <div className="max-w-7xl mx-auto mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-4">
        <button
          onClick={() => setFilter('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'active'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span>All Active</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${filter === 'active' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'new'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            New Orders
          </span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${newCount > 0 ? 'bg-orange-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
            {newCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('preparing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'preparing'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Cooking</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {preparingCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'ready'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ready to Serve</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {readyCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('served')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'served'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-slate-400" />
          <span>Past / Served</span>
        </button>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto mt-6">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">All caught up!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filter === 'active'
                ? 'No active kitchen tickets. New orders placed by customers at their tables will appear instantly here.'
                : `No orders in status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedOrders.map((order) => {
              const isNew = order.status === 'new';
              const isPreparing = order.status === 'preparing';
              const isReady = order.status === 'ready';
              const isServed = order.status === 'served';
              const isUpdating = updatingOrderId === order.id;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl bg-slate-900 border transition-all shadow-xl overflow-hidden ${
                    isNew
                      ? 'border-orange-500/80 ring-2 ring-orange-500/30 shadow-orange-500/10'
                      : isPreparing
                      ? 'border-amber-500/50 shadow-amber-500/5'
                      : isReady
                      ? 'border-emerald-500/50 shadow-emerald-500/5'
                      : 'border-slate-800 opacity-70'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b ${
                      isNew
                        ? 'bg-gradient-to-r from-orange-950/60 to-slate-900 border-orange-500/30'
                        : isPreparing
                        ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/20'
                        : isReady
                        ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/20'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black ${
                          isNew
                            ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 animate-pulse'
                            : isPreparing
                            ? 'bg-amber-500 text-slate-950'
                            : isReady
                            ? 'bg-emerald-500 text-slate-950'
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
                            <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-orange-500 text-slate-950 animate-bounce">
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

                    {/* Status Pill */}
                    <span
                      className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        isNew
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                          : isPreparing
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Ticket Items List */}
                  <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-60 bg-slate-950/40">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2.5">
                          {/* Quantity pill */}
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
                            {item.specialInstructions && (
                              <p className="text-[11px] text-amber-300 italic mt-0.5 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 inline-block">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* General Order Notes */}
                    {order.specialInstructions && (
                      <div className="mt-3 p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                        <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                          Table Instructions:
                        </span>
                        {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Ticket Footer & Actions */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs mb-3 text-slate-400 font-medium">
                      <span>Total: ${order.total.toFixed(2)}</span>
                      <span>{order.items.reduce((a, b) => a + b.quantity, 0)} total items</span>
                    </div>

                    {/* Action progression button */}
                    {isNew && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                      >
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
                      >
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Mark Order Ready</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
                      >
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Utensils className="w-4 h-4" />}
                        <span>Delivered to Table (Mark Served)</span>
                      </button>
                    )}

                    {isServed && (
                      <div className="w-full text-center text-xs font-semibold text-slate-500 py-1 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Served & Completed</span>
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
  );
};
