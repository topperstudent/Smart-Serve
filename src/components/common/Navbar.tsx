import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
  RotateCcw,
} from 'lucide-react';
import { soundService } from '../../services/soundService';
import { restaurantService } from '../../services/restaurantService';
import { Restaurant } from '../../types';
import { MobileNavDrawer, NavItemConfig } from './MobileNavDrawer';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleToggleMute = () => {
    const next = soundService.toggleMute();
    setIsMuted(next);
  };

  const navItems = [
    {
      id: 'orders' as ManagementPage,
      label: 'Live Orders',
      shortLabel: 'Orders',
      desc: 'Real-time kitchen ticket stream & voice alerts',
      icon: ChefHat,
      badge: pendingOrdersCount,
    },
    {
      id: 'kitchen' as ManagementPage,
      label: 'Kitchen KDS',
      shortLabel: 'KDS',
      desc: 'High-contrast bump bar prep line monitor',
      icon: Tv,
      badge: 0,
    },
    {
      id: 'analytics' as ManagementPage,
      label: 'Analytics',
      shortLabel: 'Stats',
      desc: 'Sales performance, 12-mo trend, IST metrics',
      icon: BarChart3,
      badge: 0,
    },
    {
      id: 'menu' as ManagementPage,
      label: 'Menu & Items',
      shortLabel: 'Menu',
      desc: 'Catalog management, photos, pricing & availability',
      icon: Utensils,
      badge: 0,
    },
    {
      id: 'tables' as ManagementPage,
      label: 'Table QR',
      shortLabel: 'QR Codes',
      desc: 'Permanent table URLs & printable acrylic stands',
      icon: QrCode,
      badge: 0,
    },
  ];

  const handlePageSelect = (pageId: ManagementPage) => {
    onSelectPage(pageId);
    setMobileMenuOpen(false);
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs text-slate-800">
      {/* Top subtle status ribbon */}
      <div className="bg-amber-500/10 border-b border-amber-500/15 px-3 sm:px-4 py-1 text-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 text-[11px] tracking-wide truncate max-w-[130px] sm:max-w-none">
              {restaurant.name}
            </span>
            <span className="hidden sm:inline text-slate-400 text-[11px]">·</span>
            <span className="hidden sm:inline text-amber-700 font-semibold text-[11px]">
              Scan. Order. Serve.
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-600 shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 font-medium">
              <Radio className="w-3 h-3 text-emerald-600" />
              <span className="text-slate-700">Firestore Live</span>
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <button
              onClick={() => onSelectPage('customer')}
              className="hover:text-amber-700 text-slate-700 font-semibold flex items-center gap-1 transition-colors px-1 py-0.5 rounded"
              title="Open table guest ordering preview"
            >
              <span className="text-[11px]">Guest Menu</span>
              <ExternalLink className="w-3 h-3 text-amber-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Restaurant */}
          <div
            onClick={() => handlePageSelect('orders')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
              <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                  SmartServe
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider px-1 sm:px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase font-mono">
                  SaaS
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[110px] sm:max-w-[200px] font-medium leading-none mt-0.5">
                {restaurant.name}
              </p>
            </div>
          </div>

          {/* Desktop Navigation System (Floating Segmented Tab Pill on lg+ screens) */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageSelect(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/80 scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600 stroke-[2.5]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
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

          {/* Desktop Right Actions (Audio Alert + Profile Dropdown) */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
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
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px] leading-tight">
                    {userEmail?.split('@')[0] || 'Owner'}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight">Restaurant Staff</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Desktop Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 text-xs text-slate-800">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="font-bold text-slate-900 truncate">{restaurant.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userEmail || 'Owner Session'}</p>
                  </div>
                  <button
                    onClick={() => handlePageSelect('customer')}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                    <span>Customer Ordering View</span>
                  </button>
                  <button
                    onClick={() => handlePageSelect('kitchen')}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reset to Clean Slate</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile & Tablet Header Controls (Visible below lg) */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2">
            {/* Quick Pending Orders Badge on Mobile (Tapping jumps to Live Orders) */}
            {pendingOrdersCount > 0 && (
              <button
                onClick={() => handlePageSelect('orders')}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                title={`${pendingOrdersCount} orders waiting`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="font-mono">{pendingOrdersCount}</span>
                <span className="hidden xs:inline">Waiting</span>
              </button>
            )}

            {/* Quick Audio Mute Toggle on Mobile */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-xl border transition-all cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${
                isMuted
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
              }`}
              title={isMuted ? 'Voice muted' : 'Voice on'}
              aria-label="Toggle voice alerts"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
            </button>

            {/* Hamburger Button (44x44px touch-accessible) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm min-w-[42px] min-h-[42px] flex items-center justify-center cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer & Backdrop Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Navigation Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-[320px] xs:max-w-[340px] bg-white shadow-2xl flex flex-col justify-between z-50 animate-in slide-in-from-right duration-200 border-l border-slate-200 text-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {restaurant.name ? restaurant.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                    {restaurant.name}
                  </h3>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Firebase Live Connected</span>
                  </p>
                </div>
              </div>

              {/* Close Button (Touch target 44x44px) */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav Options List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                Restaurant Management
              </p>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePageSelect(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer min-h-[52px] ${
                      isActive
                        ? 'bg-amber-500/10 text-slate-900 font-bold border border-amber-300/80 shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold leading-tight">{item.label}</span>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5 font-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })}

              <div className="pt-2 pb-1">
                <div className="h-px bg-slate-100" />
              </div>

              {/* Fast Direct Switchers */}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                Direct Workspaces
              </p>

              <button
                onClick={() => handlePageSelect('customer')}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-left text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors border border-slate-100 min-h-[48px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-tight">Customer Ordering Menu</span>
                    <span className="text-[10px] text-slate-500">Test guest digital ordering experience</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={() => handlePageSelect('kitchen')}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-100 min-h-[48px] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Tv className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-tight">Kitchen KDS Screen</span>
                    <span className="text-[10px] text-slate-500">Prep line touch monitor & bump bar</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>

              {/* Spoken Alert Toggle in Drawer */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {isMuted ? 'Voice Alerts Muted' : 'Voice Announcements On'}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {isMuted ? 'Orders appear silently' : 'Spoken table notifications'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleMute}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                      : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {isMuted ? 'Enable' : 'Mute'}
                </button>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-3.5 border-t border-slate-100 bg-slate-50/90 space-y-2">
              <div className="flex items-center gap-2 px-1 text-slate-500 text-[11px]">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{userEmail || 'Owner Session Active'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={async () => {
                    if (window.confirm('Reset all test orders and return restaurant to a clean initial state?')) {
                      setMobileMenuOpen(false);
                      await restaurantService.resetRestaurantData(restaurant.id);
                      window.location.reload();
                    }
                  }}
                  className="px-2.5 py-2 rounded-xl text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset Data</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="px-2.5 py-2 rounded-xl text-red-600 hover:bg-red-100/80 bg-red-50 border border-red-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

