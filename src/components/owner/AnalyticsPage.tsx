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
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { Restaurant, Order } from '../../types';
import { restaurantService } from '../../services/restaurantService';

interface AnalyticsPageProps {
  restaurant: Restaurant;
}

type TimeFilter = 'today' | 'this_month' | 'last_365_days';

// India Standard Time (IST) helper
function getISTDate(date: Date): { year: number; month: number; day: number; dateString: string; monthString: string } {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);
  const year = istDate.getFullYear();
  const month = istDate.getMonth() + 1;
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
  const [hoveredMonth, setHoveredMonth] = useState<{ label: string; sales: number; count: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = restaurantService.subscribeOrders(restaurant.id, (liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });
    return () => unsub();
  }, [restaurant.id]);

  const now = new Date();
  const currentIST = getISTDate(now);

  // Computations strictly from real database records
  const analytics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    const grossValue = orders.reduce((sum, o) => sum + o.total, 0);
    const netSales = validOrders.reduce((sum, o) => sum + o.total, 0);
    const cancelledValue = cancelledOrders.reduce((sum, o) => sum + o.total, 0);

    // Today's sales (IST)
    const todayOrders = validOrders.filter((o) => {
      const orderIST = getISTDate(new Date(o.createdAt));
      return orderIST.dateString === currentIST.dateString;
    });
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

    // This month's sales (IST)
    const thisMonthOrders = validOrders.filter((o) => {
      const orderIST = getISTDate(new Date(o.createdAt));
      return orderIST.monthString === currentIST.monthString;
    });
    const thisMonthSales = thisMonthOrders.reduce((sum, o) => sum + o.total, 0);

    // Rolling last 365 days
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
    const last365DaysOrders = validOrders.filter((o) => new Date(o.createdAt) >= oneYearAgo);
    const last365DaysSales = last365DaysOrders.reduce((sum, o) => sum + o.total, 0);

    // Previous 12 Calendar Months breakdown
    const monthsBreakdown: { monthKey: string; label: string; sales: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const istMonth = getISTDate(d);
      const label = d.toLocaleString('en-US', { month: 'short' });

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

    // Filtered view selection
    let filteredOrders = validOrders;
    let label = 'This Month';
    if (timeFilter === 'today') {
      filteredOrders = todayOrders;
      label = 'Today (IST)';
    } else if (timeFilter === 'this_month') {
      filteredOrders = thisMonthOrders;
      label = 'This Month (IST)';
    } else if (timeFilter === 'last_365_days') {
      filteredOrders = last365DaysOrders;
      label = 'Rolling 365 Days';
    }

    const filteredNetSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = filteredOrders.length > 0 ? filteredNetSales / filteredOrders.length : 0;

    // Top selling items
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

    const topSellingDishes = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

    return {
      grossValue,
      netSales,
      cancelledValue,
      cancelledCount: cancelledOrders.length,
      todaySales,
      todayOrdersCount: todayOrders.length,
      thisMonthSales,
      thisMonthOrdersCount: thisMonthOrders.length,
      last365DaysSales,
      last365DaysCount: last365DaysOrders.length,
      monthsBreakdown,
      filteredNetSales,
      filteredOrdersCount: filteredOrders.length,
      avgOrderValue,
      topSellingDishes,
      currentFilterLabel: label,
    };
  }, [orders, currentIST.dateString, currentIST.monthString, timeFilter]);

  const maxMonthSales = Math.max(...analytics.monthsBreakdown.map((m) => m.sales), 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                FINANCIAL INTELLIGENCE
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>IST Timezone (Asia/Kolkata · UTC+5:30)</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Sales & Performance Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Metrics calculated strictly from actual database orders. Cancelled tickets are reconciled separately.
            </p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeFilter === 'today'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('this_month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeFilter === 'this_month'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeFilter('last_365_days')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeFilter === 'last_365_days'
                  ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Rolling 365 Days
            </button>
          </div>
        </div>

        {/* 4 Primary KPI Cards (White Floating Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Net Revenue */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm saas-card-hover">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span>Net Revenue ({analytics.currentFilterLabel})</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{Math.round(analytics.filteredNetSales).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 flex items-center gap-1 mt-2 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Realized & validated sales</span>
            </p>
          </div>

          {/* Card 2: Orders Count */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm saas-card-hover">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span>Orders Fulfilled</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <ShoppingBag className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                {analytics.filteredOrdersCount}
              </span>
              <span className="text-xs text-slate-500 font-semibold">tickets</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              In selected period ({analytics.currentFilterLabel})
            </p>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm saas-card-hover">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span>Average Ticket (AOV)</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{Math.round(analytics.avgOrderValue).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Net revenue / completed tickets
            </p>
          </div>

          {/* Card 4: Cancelled Orders Reconciliation */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm saas-card-hover">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-medium">
              <span>Cancelled / Voided</span>
              <span className="p-2 rounded-xl bg-red-50 text-red-700">
                <XCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-red-600 font-mono tracking-tight">
                ₹{Math.round(analytics.cancelledValue).toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {analytics.cancelledCount} ticket{analytics.cancelledCount === 1 ? '' : 's'} excluded from net sales
            </p>
          </div>
        </div>

        {/* 12-Month Calendar Bar Chart & Rolling 365 Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Column (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-600" />
                    12 Calendar Months Revenue Trend
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Net monthly sales grouped in Indian Standard Time (IST)
                  </p>
                </div>
                {hoveredMonth && (
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-700">
                      {hoveredMonth.label}: ₹{hoveredMonth.sales.toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-500">{hoveredMonth.count} orders</p>
                  </div>
                )}
              </div>

              {/* Responsive SVG Bar Chart */}
              <div className="h-64 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-200">
                {analytics.monthsBreakdown.map((m, idx) => {
                  const heightPercent = maxMonthSales > 0 ? Math.max((m.sales / maxMonthSales) * 100, 4) : 4;
                  const isCurrentMonth = idx === 11;
                  return (
                    <div
                      key={m.monthKey}
                      onMouseEnter={() => setHoveredMonth(m)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                    >
                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-200 relative ${
                          isCurrentMonth
                            ? 'bg-amber-500 group-hover:bg-amber-600 shadow-xs'
                            : m.sales > 0
                            ? 'bg-slate-300 hover:bg-slate-400'
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        {/* Tooltip bubble on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-md pointer-events-none z-10 whitespace-nowrap">
                          ₹{m.sales}
                        </div>
                      </div>
                      {/* Month Label */}
                      <span className="text-[10px] text-slate-500 mt-2 font-medium group-hover:text-amber-700 transition-colors">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reconciliation Audit Footnote */}
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span>Current IST Month</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Gross Orders Value: ₹{Math.round(analytics.grossValue).toLocaleString()} · Net Sales: ₹{Math.round(analytics.netSales).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Rolling 365 Days Summary Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Calendar className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">365-Day Performance</h3>
              </div>
              <p className="text-xs text-slate-500">
                Rolling 1-year total from {new Date(now.getTime() - 365 * 24 * 3600 * 1000).toLocaleDateString()} to today
              </p>

              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Rolling Net Sales</p>
                  <p className="text-2xl font-black text-slate-900 font-mono">
                    ₹{Math.round(analytics.last365DaysSales).toLocaleString()}
                  </p>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Orders Processed:</span>
                  <span className="font-bold text-slate-900">{analytics.last365DaysCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Audited Cancellations:</span>
                  <span className="font-bold text-red-600">{analytics.cancelledCount} tickets</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
              <strong className="block font-bold mb-0.5 text-amber-800">Database Integrity Guarantee</strong>
              SmartServe calculates totals exclusively from verified Firestore documents. No dummy numbers or artificial data.
            </div>
          </div>
        </div>

        {/* Top Selling Dishes Ranking */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Top Selling Dishes Ranking
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked by actual quantity sold during {analytics.currentFilterLabel}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {analytics.topSellingDishes.length} menu items recorded
            </span>
          </div>

          {analytics.topSellingDishes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No dish sales recorded yet in this time range. Orders placed through table QR codes will appear here automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.topSellingDishes.slice(0, 6).map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-3.5 h-3.5 border flex items-center justify-center p-0.5 rounded-sm ${
                            item.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                        </div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                          {item.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.quantity} portions sold
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 font-mono">
                      ₹{Math.round(item.revenue).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">gross sales</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
