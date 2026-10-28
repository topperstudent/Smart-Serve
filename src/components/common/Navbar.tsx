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
  ExternalLink,
  Radio,
  Tv,
  ChevronDown,
} from 'lucide-react';
import { soundService } from '../../services/soundService';
import { Restaurant } from '../../types';

export type ManagementPage = 'orders' | 'analytics' | 'menu' | 'tables' | 'customer' | 'kitchen';

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
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleToggleMute = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  const navItems = [
    { id: 'orders' as ManagementPage, label: 'Live Orders', icon: ChefHat, badge: pendingOrdersCount },
    { id: 'kitchen' as ManagementPage, label: 'Kitchen KDS', icon: Tv, badge: 0 },
    { id: 'analytics' as ManagementPage, label: 'Analytics', icon: BarChart3, badge: 0 },
    { id: 'menu' as ManagementPage, label: 'Menu & Items', icon: Utensils, badge: 0 },
    { id: 'tables' as ManagementPage, label: 'Table QR', icon: QrCode, badge: 0 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F17]/90 backdrop-blur-xl border-b border-white/[0.08] text-white">
      {/* Top ambient status ribbon */}
      <div className="bg-gradient-to-r from-amber-600/20 via-orange-600/30 to-amber-600/20 border-b border-amber-500/10 px-4 py-1 flex items-center justify-between text-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300 text-[11px] tracking-wide">
              {restaurant.name}
            </span>
            <span className="hidden sm:inline text-slate-500 text-[11px]">·</span>
            <span className="hidden sm:inline text-amber-400 font-medium text-[11px]">
              Scan. Order. Serve.
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300 font-medium">Real-time Cloud Sync</span>
            </span>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => onSelectPage('customer')}
              className="hover:text-amber-300 text-slate-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Guest Order Link</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Restaurant */}
          <div
            onClick={() => onSelectPage('orders')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-[1px] shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
                  SmartServe
                </span>
                <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[200px] font-medium">
                {restaurant.name}
              </p>
            </div>
          </div>

          {/* Primary Navigation System */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-white/[0.08] shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/25 scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">
                    {item.id === 'orders' ? 'Orders' : item.id === 'kitchen' ? 'KDS' : item.id === 'analytics' ? 'Stats' : item.id === 'menu' ? 'Menu' : 'QR'}
                  </span>
                  {item.badge > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-slate-950 text-amber-400'
                          : 'bg-red-500 text-white animate-pulse'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Actions & Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Audio Voice Announcements Mute/Unmute */}
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Voice alerts are muted. Click to enable audio.' : 'Voice alerts are enabled.'}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                  : 'bg-slate-900 border-white/[0.08] text-amber-400 hover:bg-slate-800 hover:border-amber-500/40'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-white/[0.08] hover:border-white/[0.18] transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
                  {restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-[110px] leading-tight">
                    {userEmail?.split('@')[0] || 'Manager'}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">Owner</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0F172A] border border-white/[0.12] shadow-2xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-white/[0.08] mb-1">
                    <p className="font-bold text-slate-200 truncate">{restaurant.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{userEmail || 'Authenticated Staff'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectPage('customer');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Customer Ordering View</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectPage('kitchen');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center gap-2"
                  >
                    <Tv className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open Kitchen KDS Mode</span>
                  </button>
                  <div className="my-1 border-t border-white/[0.08]" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
