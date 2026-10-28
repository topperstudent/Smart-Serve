import React, { useEffect } from 'react';
import {
  X,
  ChevronRight,
  RotateCcw,
  LogOut,
  UserCheck,
  ExternalLink,
  Tv,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  LucideIcon,
} from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import { Restaurant } from '../../types';
import { ManagementPage } from './Navbar';

export interface NavItemConfig {
  id: ManagementPage;
  label: string;
  shortLabel: string;
  desc: string;
  icon: LucideIcon;
  badge: number;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: ManagementPage;
  onSelectPage: (page: ManagementPage) => void;
  restaurant: Restaurant;
  userEmail?: string;
  pendingOrdersCount?: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSignOut: () => void;
  navItems: NavItemConfig[];
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activePage,
  onSelectPage,
  restaurant,
  userEmail,
  pendingOrdersCount = 0,
  isMuted,
  onToggleMute,
  onSignOut,
  navItems,
}) => {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* 1. Backdrop Glass Blur */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Slide-out Drawer Panel with Glassmorphism Surface & Hairline Glow Borders */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[340px] xs:max-w-[360px] bg-white/90 backdrop-blur-2xl border-l border-white/50 shadow-[0_0_50px_rgba(0,0,0,0.25)] flex flex-col justify-between z-50 animate-in slide-in-from-right duration-300 text-slate-800">
        
        {/* Drawer Header (Frosted Glass with border-b) */}
        <div className="p-4 border-b border-slate-200/70 bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-md flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/25 border border-white/30 shrink-0">
                {restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-slate-900 truncate">
                  {restaurant.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/80">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-600" />
                  Live Sync
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate">
                  SmartServe Terminal
                </span>
              </div>
            </div>
          </div>

          {/* Close Button with Tactile Glass Tile */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80 shadow-xs flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
          
          {/* Section: Main Nav Items */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Management Modules
              </span>
              {pendingOrdersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white shadow-xs animate-pulse border border-red-300">
                  {pendingOrdersCount} Waiting
                </span>
              )}
            </div>

            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectPage(item.id);
                      onClose();
                    }}
                    className={`group w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer min-h-[58px] ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 text-slate-950 font-bold border-2 border-amber-400/90 shadow-[0_4px_16px_rgba(245,158,11,0.15),inset_0_1px_0_rgba(255,255,255,0.9)] scale-[1.01]'
                        : 'bg-white/75 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,0.7)] hover:border-amber-300/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon Tile */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 border border-white/20'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/60 group-hover:bg-amber-50 group-hover:text-amber-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Text info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold leading-tight tracking-tight">
                            {item.label}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-amber-500 text-white shadow-2xs">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 font-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white shadow-xs border border-red-300">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          isActive ? 'text-amber-600 stroke-[2.5]' : 'text-slate-300'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Direct Workspaces (Glass Cards with borders) */}
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-1 block mb-2">
              Connected Interfaces
            </span>

            <div className="grid grid-cols-1 gap-2">
              {/* Customer Ordering Preview */}
              <button
                onClick={() => {
                  onSelectPage('customer');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-left bg-gradient-to-r from-amber-50/80 to-orange-50/50 hover:from-amber-100/80 hover:to-orange-100/60 text-slate-800 transition-all border border-amber-200/90 shadow-xs cursor-pointer group min-h-[52px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/20 group-hover:scale-105 transition-transform">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block text-slate-900 leading-tight">
                      Guest Ordering Menu
                    </span>
                    <span className="text-[10px] text-amber-800/80 truncate block">
                      Preview diner scan-and-order view
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              {/* Kitchen KDS Terminal */}
              <button
                onClick={() => {
                  onSelectPage('kitchen');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-left bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:bg-slate-950 transition-all border border-slate-700/80 shadow-md shadow-slate-900/20 cursor-pointer group min-h-[52px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs group-hover:scale-105 transition-transform">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block text-white leading-tight">
                      Kitchen KDS Display
                    </span>
                    <span className="text-[10px] text-slate-300 truncate block">
                      Full-screen line ticket bump bar
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>
          </div>

          {/* Section: Audio Announcement Glass Tile */}
          <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  isMuted
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {isMuted ? 'Voice Alerts Off' : 'Voice Chimes Active'}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate">
                  {isMuted ? 'Orders appear silently' : 'Spoken table order chime'}
                </p>
              </div>
            </div>

            <button
              onClick={onToggleMute}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                isMuted
                  ? 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                  : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
              }`}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        </div>

        {/* Drawer Footer Actions (Frosted Glass Container with Hairline Border) */}
        <div className="p-3.5 border-t border-slate-200/80 bg-gradient-to-t from-white/95 to-white/80 backdrop-blur-md space-y-2.5 shadow-lg">
          <div className="flex items-center gap-2 px-1 text-slate-600 text-[11px] bg-slate-100/80 py-1.5 rounded-xl border border-slate-200/60">
            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-1.5" />
            <span className="truncate font-semibold">{userEmail || 'Active Owner Session'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Clean Slate Reset */}
            <button
              onClick={async () => {
                if (window.confirm('Reset all test orders and return restaurant to a clean initial state?')) {
                  onClose();
                  await restaurantService.resetRestaurantData(restaurant.id);
                  window.location.reload();
                }
              }}
              className="px-2.5 py-2.5 rounded-xl text-slate-700 hover:text-slate-900 bg-white/90 hover:bg-slate-100 border border-slate-200/90 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px] shadow-2xs active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Reset Data</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="px-2.5 py-2.5 rounded-xl text-red-700 hover:text-red-900 bg-red-50/90 hover:bg-red-100 border border-red-200/90 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[44px] shadow-2xs active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
