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
  Maximize2,
  CheckSquare,
  Square,
  ArrowLeft,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { soundService } from '../../services/soundService';

interface KitchenViewProps {
  restaurantId: string;
  onExitKDS?: () => void;
}

// Elapsed timer helper for KDS
function getKdsElapsed(createdAt: string | number) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return { text: '< 1 min', mins, urgency: 'normal' };
  if (mins < 12) return { text: `${mins} min`, mins, urgency: 'normal' };
  if (mins < 22) return { text: `${mins} min`, mins, urgency: 'warning' };
  return { text: `${mins} min DELAY`, mins, urgency: 'critical' };
}

export const KitchenView: React.FC<KitchenViewProps> = ({ restaurantId, onExitKDS }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'active' | 'new' | 'preparing' | 'ready' | 'served'>('active');
  const [isMuted, setIsMuted] = useState(soundService.getIsMuted());
  const [audioUnlocked, setAudioUnlocked] = useState(soundService.getIsAudioUnlocked());
  const [lastAnnouncement, setLastAnnouncement] = useState<{ message: string; played: boolean; time: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Line-item checklist state (cooks can cross off items per order!)
  const [itemCheckedState, setItemCheckedState] = useState<{ [key: string]: boolean }>({});

  // Live timer tick every 15 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const unsubscribe = restaurantService.subscribeOrders(restaurantId, (liveOrders) => {
      if (isInitialLoadRef.current) {
        soundService.markInitialOrdersAsAnnounced(liveOrders);
        isInitialLoadRef.current = false;
        setOrders(liveOrders);
        return;
      }

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

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setItemCheckedState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const newCount = orders.filter((o) => o.status === 'new').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const activeCount = newCount + preparingCount + readyCount;

  const displayedOrders = orders
    .filter((o) => {
      if (filter === 'active') return o.status === 'new' || o.status === 'preparing' || o.status === 'ready';
      return o.status === filter;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // KDS displays oldest first!

  return (
    <div className="min-h-screen bg-[#05080E] text-slate-100 p-4 sm:p-6 lg:p-8" onClick={handleUnlockAudio}>
      {/* KDS Header Banner */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.1]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-orange-500 text-slate-950 font-mono">
              KDS TERMINAL
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Order Stream Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-400" />
            Kitchen Display System
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            High-contrast bump bar layout for prep lines. Tap dishes to mark prep progress.
          </p>
        </div>

        {/* Audio & Control Center */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onExitKDS && (
            <button
              onClick={onExitKDS}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={handleTestVoice}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-white/[0.12] hover:border-amber-500 text-amber-400 hover:bg-slate-800 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Voice Announcement</span>
          </button>

          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              isMuted
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Voice Enabled'}</span>
          </button>
        </div>
      </div>

      {/* Audio Unlock Notice if required */}
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

      {/* Filter Tabs & Counters */}
      <div className="max-w-7xl mx-auto mt-6 flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => setFilter('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'active'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08]'
          }`}
        >
          <span>Active Tickets</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${filter === 'active' ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-slate-800 text-slate-300'}`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'new'
              ? 'bg-orange-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
          <span>New</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${newCount > 0 ? 'bg-orange-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}>
            {newCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('preparing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'preparing'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08]'
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
              ? 'bg-emerald-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Plated / Ready</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {readyCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('served')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'served'
              ? 'bg-slate-700 text-white font-black'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08]'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-slate-400" />
          <span>History / Served</span>
        </button>
      </div>

      {/* Kitchen Ticket Cards */}
      <div className="max-w-7xl mx-auto mt-6">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-white/[0.08] p-8">
            <ChefHat className="w-14 h-14 text-slate-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white">All Clear, Chef!</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {filter === 'active'
                ? 'No active tickets waiting in the kitchen. New orders will appear instantly with high-volume audio alerts.'
                : `No orders in status "${filter}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedOrders.map((order) => {
              const isNew = order.status === 'new';
              const isPreparing = order.status === 'preparing';
              const isReady = order.status === 'ready';
              const isServed = order.status === 'served';
              const isUpdating = updatingOrderId === order.id;

              const elapsed = getKdsElapsed(order.createdAt);
              const isCriticalDelay = elapsed.urgency === 'critical';
              const isWarningDelay = elapsed.urgency === 'warning';

              return (
                <div
                  key={order.id}
                  className={`flex flex-col justify-between rounded-2xl bg-[#0B0F17] border-2 transition-all shadow-2xl overflow-hidden ${
                    isCriticalDelay
                      ? 'border-red-500 ring-4 ring-red-500/20'
                      : isNew
                      ? 'border-orange-500 ring-2 ring-orange-500/30'
                      : isWarningDelay
                      ? 'border-amber-500'
                      : isPreparing
                      ? 'border-amber-500/60'
                      : isReady
                      ? 'border-emerald-500'
                      : 'border-slate-800 opacity-70'
                  }`}
                >
                  {/* High Contrast Ticket Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b-2 ${
                      isCriticalDelay
                        ? 'bg-red-950/80 border-red-500/60 text-white'
                        : isNew
                        ? 'bg-gradient-to-r from-orange-950/80 to-slate-900 border-orange-500/60'
                        : isPreparing
                        ? 'bg-amber-950/60 border-amber-500/50'
                        : isReady
                        ? 'bg-emerald-950/60 border-emerald-500/50'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black shadow-lg ${
                          isCriticalDelay
                            ? 'bg-red-500 text-white animate-pulse'
                            : isNew
                            ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-slate-950 animate-pulse'
                            : isPreparing
                            ? 'bg-amber-500 text-slate-950'
                            : isReady
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-black leading-none">Table</span>
                        <span className="text-2xl leading-none font-black">{order.tableNumber}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-white">#{order.id}</span>
                          {isNew && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500 text-slate-950">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                              isCriticalDelay
                                ? 'bg-red-600 text-white animate-bounce'
                                : isWarningDelay
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            ⏱ {elapsed.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                        isNew
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : isPreparing
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isReady
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Checklist Dish Items */}
                  <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-72 bg-slate-950/70">
                    {order.items.map((item, idx) => {
                      const isChecked = !!itemCheckedState[`${order.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, idx)}
                          className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-950/30 border-emerald-500/30 opacity-60'
                              : 'bg-slate-900/90 border-white/[0.08] hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-amber-400">
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-500" />
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-amber-400 font-mono">
                                  {item.quantity}×
                                </span>
                                <span
                                  className={`text-sm font-extrabold text-white leading-tight ${
                                    isChecked ? 'line-through text-slate-400' : ''
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </div>
                              {item.specialInstructions && (
                                <p className="text-xs text-amber-300 font-bold mt-1 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                                  Special: {item.specialInstructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {order.specialInstructions && (
                      <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200">
                        <strong className="block text-amber-400 uppercase text-[10px] tracking-wider mb-0.5">
                          General Order Instructions:
                        </strong>
                        {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Big KDS Touch Actions */}
                  <div className="p-4 bg-slate-950 border-t border-white/[0.1]">
                    {isNew && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all uppercase tracking-wider"
                      >
                        {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all uppercase tracking-wider"
                      >
                        {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        <span>Order Ready (Plate)</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/[0.15] font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
                      >
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Utensils className="w-4 h-4 text-emerald-400" />}
                        <span>Mark Delivered & Served</span>
                      </button>
                    )}

                    {isServed && (
                      <div className="w-full text-center text-xs font-bold text-slate-500 py-2 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Completed</span>
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
