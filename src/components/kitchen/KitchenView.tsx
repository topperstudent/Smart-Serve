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
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // KDS displays oldest first

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 sm:p-6 lg:p-8" onClick={handleUnlockAudio}>
      {/* KDS Header Banner */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 font-mono">
              KDS TERMINAL
            </span>
            <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Order Stream Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-600" />
            Kitchen Display System
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            High-contrast bump bar layout for prep lines. Tap dishes to mark prep progress.
          </p>
        </div>

        {/* Audio & Control Center */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onExitKDS && (
            <button
              onClick={onExitKDS}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={handleTestVoice}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:border-amber-400 text-amber-700 hover:bg-amber-50 transition-all shadow-2xs"
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-600" />
            <span>Test Voice Announcement</span>
          </button>

          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
              isMuted
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Voice Enabled'}</span>
          </button>
        </div>
      </div>

      {/* Audio Unlock Notice if required */}
      {!audioUnlocked && (
        <div className="max-w-7xl mx-auto mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
            <span className="text-slate-800">
              <strong className="text-amber-800">Audio Autoplay Ready:</strong> Click anywhere on the screen or tap the button to enable automatic spoken order alerts.
            </span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg whitespace-nowrap shadow-xs"
          >
            Enable Voice
          </button>
        </div>
      )}

      {/* Filter Tabs & Counters */}
      <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 border-b border-slate-200/90 pb-4 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setFilter('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            filter === 'active'
              ? 'bg-slate-900 text-white shadow-xs font-black'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Active Tickets</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${filter === 'active' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100 text-slate-700'}`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'new'
              ? 'bg-amber-500 text-white font-black shadow-xs'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
          <span>New</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${newCount > 0 ? 'bg-orange-600 text-white font-bold' : 'bg-slate-100 text-slate-600'}`}>
            {newCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('preparing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'preparing'
              ? 'bg-amber-500 text-white font-black shadow-xs'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Cooking</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {preparingCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'ready'
              ? 'bg-emerald-600 text-white font-black shadow-xs'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Plated / Ready</span>
          <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {readyCount}
          </span>
        </button>

        <button
          onClick={() => setFilter('served')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'served'
              ? 'bg-slate-800 text-white font-black shadow-xs'
              : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Utensils className="w-3.5 h-3.5 text-slate-500" />
          <span>History / Served</span>
        </button>
      </div>

      {/* Kitchen Ticket Cards */}
      <div className="max-w-7xl mx-auto mt-6">
        {displayedOrders.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-200/90 p-8 shadow-2xs">
            <ChefHat className="w-14 h-14 text-slate-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-slate-900">All Clear, Chef!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                  className={`flex flex-col justify-between rounded-2xl bg-white border-2 transition-all shadow-sm overflow-hidden ${
                    isCriticalDelay
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : isNew
                      ? 'border-amber-500 ring-2 ring-amber-500/20'
                      : isWarningDelay
                      ? 'border-amber-400'
                      : isPreparing
                      ? 'border-amber-300'
                      : isReady
                      ? 'border-emerald-500'
                      : 'border-slate-200 opacity-60'
                  }`}
                >
                  {/* High Contrast Ticket Header */}
                  <div
                    className={`p-4 flex items-center justify-between border-b ${
                      isCriticalDelay
                        ? 'bg-red-50 border-red-200'
                        : isNew
                        ? 'bg-amber-50 border-amber-200'
                        : isPreparing
                        ? 'bg-amber-50/50 border-amber-200'
                        : isReady
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black shadow-xs ${
                          isCriticalDelay
                            ? 'bg-red-600 text-white animate-pulse'
                            : isNew
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white animate-pulse'
                            : isPreparing
                            ? 'bg-amber-500 text-white'
                            : isReady
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-black leading-none">Table</span>
                        <span className="text-2xl leading-none font-black">{order.tableNumber}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">#{order.id}</span>
                          {isNew && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
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
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
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
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isPreparing
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isReady
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Checklist Dish Items */}
                  <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-72 bg-white">
                    {order.items.map((item, idx) => {
                      const isChecked = !!itemCheckedState[`${order.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, idx)}
                          className={`flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-200 opacity-60'
                              : 'bg-slate-50 border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-amber-600">
                              {isChecked ? (
                                <CheckSquare className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-400" />
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900 font-mono">
                                  {item.quantity}×
                                </span>
                                <span
                                  className={`text-sm font-extrabold text-slate-900 leading-tight ${
                                    isChecked ? 'line-through text-slate-400' : ''
                                  }`}
                                >
                                  {item.name}
                                </span>
                              </div>
                              {item.specialInstructions && (
                                <p className="text-xs text-amber-900 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Special: {item.specialInstructions}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {order.specialInstructions && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <strong className="block text-amber-800 uppercase text-[10px] tracking-wider mb-0.5">
                          General Order Instructions:
                        </strong>
                        {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Big KDS Touch Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    {isNew && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'preparing')}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all uppercase tracking-wider"
                      >
                        {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Flame className="w-5 h-5" />}
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {isPreparing && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all uppercase tracking-wider"
                      >
                        {isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        <span>Order Ready (Plate)</span>
                      </button>
                    )}

                    {isReady && (
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider shadow-sm"
                      >
                        {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Utensils className="w-4 h-4 text-emerald-400" />}
                        <span>Mark Delivered & Served</span>
                      </button>
                    )}

                    {isServed && (
                      <div className="w-full text-center text-xs font-bold text-slate-500 py-2 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
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
