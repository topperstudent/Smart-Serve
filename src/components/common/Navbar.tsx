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
import { restaurantService } from '../../services/restaurantService';
import { Restaurant } from '../../types';
import { APP_CONFIG } from '../../config/appConfig';

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs text-slate-800">
      {/* Top subtle status ribbon */}
      <div className="bg-amber-500/10 border-b border-amber-500/15 px-4 py-1 flex items-center justify-between text-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 text-[11px] tracking-wide">
              {restaurant.name}
            </span>
            <span className="hidden sm:inline text-slate-400 text-[11px]">·</span>
            <span className="hidden sm:inline text-amber-700 font-semibold text-[11px]">
              Scan. Order. Serve.
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <Radio className="w-3 h-3 text-emerald-600" />
              <span className="text-slate-700">Firebase Firestore Live</span>
            </span>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => onSelectPage('customer')}
              className="hover:text-amber-700 text-slate-700 font-semibold flex items-center gap-1 transition-colors"
              title="Open table guest ordering preview"
            >
              <span>Guest Order Link</span>
              <ExternalLink className="w-3 h-3 text-amber-600" />
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-slate-900">
                  SmartServe
                </span>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase font-mono">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px] font-medium">
                {restaurant.name}
              </p>
            </div>
          </div>

          {/* Primary Navigation System (White Floating Tab Pill) */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPage(item.id)}
                  className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/80 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">
                    {item.id === 'orders' ? 'Orders' : item.id === 'kitchen' ? 'KDS' : item.id === 'analytics' ? 'Stats' : item.id === 'menu' ? 'Menu' : 'QR'}
                  </span>
                  {item.badge > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-amber-600 text-white'
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
              title={isMuted ? 'Voice alerts are muted. Click to enable audio.' : 'Voice alerts are active.'}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600 shadow-2xs'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
            </button>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                  {restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px] leading-tight">
                    {userEmail?.split('@')[0] || 'Owner'}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">Restaurant Staff</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-xs text-slate-800">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="font-bold text-slate-900 truncate">{restaurant.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userEmail || 'Owner Session'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectPage('customer');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Ordering View</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectPage('kitchen');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Tv className="w-3.5 h-3.5 text-amber-600" />
                    <span>Kitchen KDS Terminal</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Reset all test orders and return restaurant to a clean initial state?')) {
                        setShowUserMenu(false);
                        await restaurantService.resetRestaurantData(restaurant.id);
                        window.location.reload();
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reset to Clean Slate</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
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
