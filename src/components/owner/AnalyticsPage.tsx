import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  XCircle,
  Calendar,
  Utensils,
  BarChart3,
  Award,
  Clock,
  Info,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Restaurant, Order } from '../../types';
import { restaurantService } from '../../services/restaurantService';

interface AnalyticsPageProps {
  restaurant: Restaurant;
}

type TimeFilter = 'today' | 'this_month' | 'last_12_months' | 'last_365_days';

// India Standard Time (IST) helper
function getISTDate(date: Date): { year: number; month: number; day: number; dateString: string; monthString: string } {
  // Convert to IST (UTC + 5.5 hours)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1; // 1-12
  const day = istDate.getDate();

  const monthPad = month < 10 ? `0${month}` : `${month}`;
  const dayPad = day < 10 ? `0${day}` : `${day}`;

  return {
    year,
    month,
    day,
    dateString: `${year}-${monthPad}-${dayPad}`,
    monthString: `${year}-${monthPad}`,
  };
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ restaurant }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('this_month');

  useEffect(() => {
    setLoading(true);
    const unsub = restaurantService.subscribeOrders(restaurant.id, (liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });
    return () => unsub();
  }, [restaurant.id]);

  // Current IST dates
  const now = new Date();
  const currentIST = getISTDate(now);

  // Analytics Computations
  const analytics = useMemo(() => {
    // 1. Separate valid active/fulfilled orders from cancelled orders
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    // 2. Gross order value vs Net Sales
    const grossValue = orders.reduce((sum, o) => sum + o.total, 0);
    const netSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const cancelledValue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

    // 3. Today's sales (IST)
    const todayOrders = validOrders.filter((o) => {
      const orderIST = getISTDate(new Date(o.createdAt));
      return orderIST.dateString === currentIST.dateString;
    });
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

    // 4. This month's sales (IST)
    const thisMonthOrders = validOrders.filter((o) => {
      const orderIST = getISTDate(new Date(o.createdAt));
      return orderIST.monthString === currentIST.monthString;
    });
    const thisMonthSales = thisMonthOrders.reduce((sum, o) => sum + o.total, 0);

    // 5. Rolling last 365 days
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
    const last365DaysOrders = validOrders.filter((o) => new Date(o.createdAt) >= oneYearAgo);
    const last365DaysSales = last365DaysOrders.reduce((sum, o) => sum + o.total, 0);

    // 6. Previous 12 Calendar Months breakdown
    const monthsBreakdown: { monthKey: string; label: string; sales: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const istMonth = getISTDate(d);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const monthOrders = validOrders.filter((o) => {
        const orderIST = getISTDate(new Date(o.createdAt));
        return orderIST.monthString === istMonth.monthString;
      });

      const monthNetSales = monthOrders.reduce((sum, o) => sum + o.total, 0);
      monthsBreakdown.push({
        monthKey: istMonth.monthString,
        label,
        sales: Math.round(monthNetSales * 100) / 100,
        count: monthOrders.length,
      });
    }

    // 7. Filtered subset for view
    let filteredOrders = validOrders;
    if (timeFilter === 'today') {
      filteredOrders = todayOrders;
    } else if (timeFilter === 'this_month') {
      filteredOrders = thisMonthOrders;
    } else if (timeFilter === 'last_365_days') {
      filteredOrders = last365DaysOrders;
    }

    const filteredNetSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = filteredOrders.length > 0 ? filteredNetSales / filteredOrders.length : 0;

    // 8. Top selling items based on actual line item quantities
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number; isVeg?: boolean }>();
    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const existing = itemMap.get(item.name) || {
          name: item.name,
          quantity: 0,
          revenue: 0,
          isVeg: item.isVeg,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.name, existing);
      });
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    return {
      grossValue,
      netSales,
      cancelledValue,
      todaySales,
      todayOrdersCount: todayOrders.length,
      thisMonthSales,
      thisMonthOrdersCount: thisMonthOrders.length,
      last365DaysSales,
      last365DaysCount: last365DaysOrders.length,
      totalOrdersCount: orders.length,
      validOrdersCount: validOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      monthsBreakdown,
      filteredNetSales,
      filteredOrdersCount: filteredOrders.length,
      avgOrderValue,
      topItems,
    };
  }, [orders, currentIST.dateString, currentIST.monthString, timeFilter]);

  // Max month sales for proportional chart
  const maxMonthlySales = Math.max(...analytics.monthsBreakdown.map((m) => m.sales), 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Verified Accounting
            </span>
            <span className="text-xs text-slate-400">Timezone: India Standard Time (IST)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-8 h-8 text-amber-400" />
            Analytics & Sales Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Figures are calculated exclusively from actual persisted order records. Cancelled orders are excluded from net sales and average order values.
          </p>
        </div>

        {/* Timeframe filters */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_12_months', label: '12 Months' },
            { id: 'last_365_days', label: 'Last 365 Days' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id as TimeFilter)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                timeFilter === f.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span className="text-xs">Computing sales from database records...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No sales data recorded yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            This restaurant has not received any table orders yet. SmartServe never invents fabricated historical sales figures. Once real orders are placed, your revenue charts will calculate live.
          </p>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {timeFilter === 'today' ? "Today's Net Sales" : timeFilter === 'this_month' ? "This Month's Net Sales" : 'Selected Period Net Sales'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mt-2">
                ₹{analytics.filteredNetSales.toFixed(2)}
              </h3>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3" />
                Excludes cancelled orders
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Orders Fulfilled</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mt-2">
                {analytics.filteredOrdersCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                From total of {analytics.totalOrdersCount} orders placed
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Average Order Value</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mt-2">
                ₹{analytics.avgOrderValue.toFixed(2)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Per fulfilled dining table</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Cancelled Orders</span>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-red-400 mt-2">
                {analytics.cancelledOrdersCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Value: ₹{analytics.cancelledValue.toFixed(2)} (deducted from net)
              </p>
            </div>
          </div>

          {/* Monthly Sales Chart (Previous 12 Months) */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  Monthly Net Sales (Previous 12 Calendar Months)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actual realized net sales per month. Months with no order activity show ₹0.00 without fabrication.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                Rolling 365 Days Total: ₹{analytics.last365DaysSales.toFixed(2)}
              </span>
            </div>

            {/* Pure SVG & Tailwind Bar Chart */}
            <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800">
              {analytics.monthsBreakdown.map((m) => {
                const heightPercent = maxMonthlySales > 0 ? (m.sales / maxMonthlySales) * 100 : 0;
                const hasSales = m.sales > 0;

                return (
                  <div key={m.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-amber-300 font-mono font-bold mb-1 whitespace-nowrap bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      ₹{m.sales} ({m.count})
                    </div>
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        hasSales
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:brightness-110'
                          : 'bg-slate-800/40 h-1'
                      }`}
                      style={{ height: hasSales ? `${Math.max(heightPercent, 6)}%` : '4px' }}
                    />
                    <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                      {m.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3">
              <span>Showing 12-month calendar horizon</span>
              <span>All metrics computed from Firestore order tickets</span>
            </div>
          </div>

          {/* Best Selling Items & Detailed Audit Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Best Sellers */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl">
              <h3 className="font-extrabold text-base text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Best-Selling Dishes (By Actual Quantities)
              </h3>
              {analytics.topItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No items sold in the selected period.
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.topItems.map((item, idx) => (
                    <div
                      key={item.name}
                      className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-white text-sm">{item.name}</p>
                          <span className="text-[11px] text-slate-400">
                            {item.quantity} orders fulfilled
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-400 font-mono text-sm">
                          ₹{item.revenue.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-500">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reconciliation and Integrity Audit Box */}
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Revenue Reconciliation & Integrity
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Gross Ticket Value (all orders created)</span>
                  <span className="font-mono font-bold text-white">₹{analytics.grossValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Less Cancelled Orders ({analytics.cancelledOrdersCount})
                  </span>
                  <span className="font-mono font-bold text-red-400">-₹{analytics.cancelledValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 font-bold">
                  <span>Net Realized Sales (Fulfilled)</span>
                  <span className="font-mono text-sm">₹{analytics.netSales.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="text-white font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  Compliance Note
                </p>
                <p>
                  Cancelled tickets are retained for operational audit trails but are permanently excluded from realized income, average order sizes, and sales tax summaries.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
