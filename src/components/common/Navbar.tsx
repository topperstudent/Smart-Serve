import React, { useState } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  BarChart3,
  Utensils,
  QrCode,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  ExternalLink,
  Wifi,
  User,
} from 'lucide-react';
import { soundService } from '../../services/soundService';
import { Restaurant } from '../../types';

export type ManagementPage = 'orders' | 'analytics' | 'menu' | 'tables' | 'customer';

interface NavbarProps {
  activePage: ManagementPage;
  onSelectPage: (page: ManagementPage) => void;
  restaurant: Restaurant;
  userEmail?: string;
  onSignOut: () => void;
  pendingOrdersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onSelectPage,
  restaurant,
  userEmail,
  onSignOut,
  pendingOrdersCount = 0,
}) => {
  const [isMuted, setIsMuted] = useState(soundService.getIsMuted());

  const handleToggleMute = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Banner with Restaurant Name & Context */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-xs font-semibold px-4 py-1 text-center flex items-center justify-between">
        <div className="flex items-center gap-2 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          <span className="font-bold">{restaurant.name}</span>
          <span className="hidden sm:inline text-amber-200/80">• Scan. Order. Serve.</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Restaurant */}
          <div
            onClick={() => onSelectPage('orders')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-400 bg-clip-text text-transparent">
                  SmartServe
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hidden sm:inline">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[160px]">
                {restaurant.name}
              </p>
            </div>
          </div>

          {/* Core 4 Navigation Sections (Section C) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {/* 1. Orders */}
            <button
              onClick={() => onSelectPage('orders')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePage === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Orders</span>
              {pendingOrdersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            {/* 2. Analytics */}
            <button
              onClick={() => onSelectPage('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePage === 'analytics'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>

            {/* 3. Menu & Items */}
            <button
              onClick={() => onSelectPage('menu')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePage === 'menu'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span className="hidden md:inline">Menu & Items</span>
              <span className="md:hidden">Menu</span>
            </button>

            {/* 4. Table QR */}
            <button
              onClick={() => onSelectPage('tables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePage === 'tables'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden md:inline">Table QR</span>
              <span className="md:hidden">QR</span>
            </button>
          </nav>

          {/* Quick Actions & User Center */}
          <div className="flex items-center gap-2">
            {/* Customer view preview */}
            <button
              onClick={() => onSelectPage('customer')}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
              title="Test table QR customer ordering experience"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Customer View</span>
            </button>

            {/* Voice Mute button */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute voice announcements' : 'Mute voice announcements'}
              className={`p-2 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 rounded-lg hover:border-red-900/40 transition-colors"
              title="Sign Out of Restaurant Account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
