import React, { useState, useEffect } from 'react';
import { Navbar, ManagementPage } from './components/common/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { OrdersPage } from './components/owner/OrdersPage';
import { AnalyticsPage } from './components/owner/AnalyticsPage';
import { MenuPage } from './components/owner/MenuPage';
import { TableQrPage } from './components/owner/TableQrPage';
import { KitchenView } from './components/kitchen/KitchenView';
import { CustomerView } from './components/customer/CustomerView';
import { auth, onAuthStateChanged, fbSignOut, User } from './firebase/config';
import { restaurantService } from './services/restaurantService';
import { Restaurant } from './types';
import { DEMO_RESTAURANT_ID } from './data/seedData';
import { UtensilsCrossed, RefreshCw, ArrowLeft, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [activePage, setActivePage] = useState<ManagementPage>('orders');
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  // Customer URL parameters
  const [customerRestaurantId, setCustomerRestaurantId] = useState<string | null>(null);
  const [customerTableId, setCustomerTableId] = useState<string | null>(null);
  const [isCustomerMode, setIsCustomerMode] = useState(false);

  // 1. Parse URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restParam = params.get('restaurant');
    const tableParam = params.get('table');
    const viewParam = params.get('view');
    const pathname = window.location.pathname;

    if (tableParam || pathname.includes('/menu')) {
      setCustomerRestaurantId(restParam || DEMO_RESTAURANT_ID);
      setCustomerTableId(tableParam || '1');
      setIsCustomerMode(true);
    } else if (viewParam === 'customer') {
      setCustomerRestaurantId(restParam || DEMO_RESTAURANT_ID);
      setCustomerTableId('1');
      setIsCustomerMode(true);
    }
  }, []);

  // 2. Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let rest = await restaurantService.getRestaurantByOwnerId(user.uid);
          if (!rest) {
            rest = await restaurantService.createRestaurantForOwner({
              ownerId: user.uid,
              ownerName: user.displayName || 'Owner',
              restaurantName: user.displayName ? `${user.displayName}'s Restaurant` : 'SmartServe Restaurant',
            });
          }
          setRestaurant(rest);
          // Redirect directly to Orders page upon authentication
          setActivePage('orders');
        } catch (e) {
          console.error('Failed to load restaurant profile:', e);
        }
      } else {
        setRestaurant(null);
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  // 3. Monitor pending orders count for navbar badge
  useEffect(() => {
    if (!restaurant) return;
    const unsub = restaurantService.subscribeOrders(restaurant.id, (orders) => {
      const pending = orders.filter((o) => o.status === 'new' || o.status === 'preparing').length;
      setPendingOrdersCount(pending);
    });
    return () => unsub();
  }, [restaurant?.id]);

  // Auth success callback
  const handleAuthSuccess = (authenticatedRestaurant: Restaurant) => {
    setRestaurant(authenticatedRestaurant);
    setIsCustomerMode(false);
    setActivePage('orders');
  };

  // Sign out callback
  const handleSignOut = async () => {
    await fbSignOut(auth);
    setCurrentUser(null);
    setRestaurant(null);
    setIsCustomerMode(false);
    setActivePage('orders');
  };

  // Customer experience route (No login required for diners)
  if (isCustomerMode) {
    const targetRestId = customerRestaurantId || restaurant?.id || DEMO_RESTAURANT_ID;
    const targetTable = customerTableId || '1';

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        {/* Customer Top Bar */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between text-xs shadow-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
              S
            </div>
            <span className="font-bold text-slate-900 truncate">SmartServe Guest Ordering</span>
          </div>

          <button
            onClick={() => setIsCustomerMode(false)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors shrink-0 cursor-pointer min-h-[34px]"
          >
            <span>Staff Login</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        <CustomerView
          restaurantId={targetRestId}
          tableNumber={targetTable}
          onGoToKitchen={() => setIsCustomerMode(false)}
        />
      </div>
    );
  }

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500 gap-3 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white animate-pulse">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-slate-700">Initializing SmartServe Terminal...</p>
      </div>
    );
  }

  // Unauthenticated: Render Sign In / Sign Up Form
  if (!currentUser && !restaurant) {
    return (
      <AuthModal
        onSuccess={handleAuthSuccess}
        onExploreAsCustomer={() => {
          setCustomerRestaurantId(DEMO_RESTAURANT_ID);
          setCustomerTableId('2');
          setIsCustomerMode(true);
        }}
      />
    );
  }

  // Authenticated Owner Experience
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Persistent Global Navigation */}
      {restaurant && (
        <Navbar
          activePage={activePage}
          onSelectPage={(page) => {
            if (page === 'customer') {
              setCustomerRestaurantId(restaurant.id);
              setCustomerTableId('1');
              setIsCustomerMode(true);
            } else {
              setActivePage(page);
            }
          }}
          restaurant={restaurant}
          userEmail={currentUser?.email || undefined}
          onSignOut={handleSignOut}
          pendingOrdersCount={pendingOrdersCount}
        />
      )}

      {/* Management View Switcher */}
      <main className="flex-1">
        {restaurant && activePage === 'orders' && (
          <OrdersPage
            restaurant={restaurant}
            userEmail={currentUser?.email || undefined}
            onNavigateToTables={() => setActivePage('tables')}
            onOpenCustomerMenu={(tblId) => {
              setCustomerRestaurantId(restaurant.id);
              setCustomerTableId(tblId);
              setIsCustomerMode(true);
            }}
          />
        )}

        {restaurant && activePage === 'analytics' && (
          <AnalyticsPage restaurant={restaurant} />
        )}

        {restaurant && activePage === 'menu' && (
          <MenuPage restaurant={restaurant} />
        )}

        {restaurant && activePage === 'kitchen' && (
          <KitchenView restaurantId={restaurant.id} />
        )}

        {restaurant && activePage === 'tables' && (
          <TableQrPage
            restaurant={restaurant}
            onOpenCustomerTable={(tblId) => {
              setCustomerRestaurantId(restaurant.id);
              setCustomerTableId(tblId);
              setIsCustomerMode(true);
            }}
          />
        )}
      </main>
    </div>
  );
}
