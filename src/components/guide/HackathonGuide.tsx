import React, { useState } from 'react';
import {
  HelpCircle,
  CheckSquare,
  Square,
  Database,
  ChefHat,
  QrCode,
  Volume2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FolderTree,
  Terminal,
  Code2,
  Layers,
} from 'lucide-react';

export const HackathonGuide: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checklist = [
    {
      id: 'auth',
      title: 'Owner Authentication & Setup',
      desc: 'Owner can sign in (or 1-click demo login), edit restaurant name, currency, and tax rate.',
    },
    {
      id: 'menu_crud',
      title: 'Menu Management (Add / Edit / Toggle Stock)',
      desc: 'Add new dishes, set price, veg/non-veg flag, and toggle sold-out status in real time.',
    },
    {
      id: 'qr_gen',
      title: 'Table QR Code Generator & Printing',
      desc: 'Create unique dining tables, preview generated QR code, and print or download the table stand card.',
    },
    {
      id: 'qr_open',
      title: 'Customer Scans & Opens Menu',
      desc: 'Customer opens table link (e.g., Table 2), sees genuine live restaurant dishes, prices, and categories.',
    },
    {
      id: 'cart_calc',
      title: 'Cart Operations & Trusted Price Validation',
      desc: 'Customer adds items, types special requests, and places order. Subtotal and tax are calculated using trusted database prices.',
    },
    {
      id: 'kds_realtime',
      title: 'Instant Kitchen Display System (KDS) Arrival',
      desc: 'Order appears automatically on the kitchen screen via Firestore onSnapshot real-time listener without page refresh.',
    },
    {
      id: 'voice_alert',
      title: 'Voice Alert (SpeechSynthesis API)',
      desc: 'Kitchen terminal plays a two-tone chime and speaks: "New order received. Table 2. One Butter Chicken and Two Naan."',
    },
    {
      id: 'status_transition',
      title: 'Live Order Status Progression',
      desc: 'Kitchen staff clicks "Start Cooking" -> "Order Ready" -> "Delivered to Table". Customer tracker updates instantly in real time.',
    },
    {
      id: 'analytics',
      title: 'Sales Analytics & Order History',
      desc: 'Owner dashboard reflects real-time total revenue, order count, and top-selling dishes breakdown.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
              Hackathon Architecture Guide
            </span>
            <span className="text-xs text-amber-400 font-semibold">For Beginners & Evaluators</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            SmartServe: Scan. Order. Serve.
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            SmartServe connects three distinct restaurant personas into one unified, real-time web application powered by React, Tailwind CSS, and Firebase Firestore.
          </p>
        </div>

        {/* 1. Interactive Testing Checklist */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                Live Feature Test Checklist
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Test each flow between the Customer, Kitchen, and Owner tabs. Click items to check them off.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {Object.values(checkedItems).filter(Boolean).length} / {checklist.length} Passed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {checklist.map((item) => {
              const isChecked = Boolean(checkedItems[item.id]);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isChecked
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 text-amber-400">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isChecked ? 'text-emerald-300 line-through' : 'text-white'}`}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. System Architecture & The 3 Experiences */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            How The Three Experiences Connect
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            All three experiences run on top of the same shared database. When a customer orders at a table, the kitchen hears and sees it immediately, and the owner's revenue dashboard increments in real time:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* 1. Customer */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">1. Customer QR Menu</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                No app installation or account needed. Table QR code opens <code className="text-amber-400">?restaurant=...&table=2</code>. Displays real-time dishes, cart, and live tracking stepper.
              </p>
            </div>

            {/* 2. Kitchen */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold mb-3">
                <ChefHat className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">2. Kitchen Display (KDS)</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dedicated tablet/TV dashboard. Real-time Firestore snapshot listener pops tickets instantly. Uses Web SpeechSynthesis API to announce dishes out loud to kitchen cooks.
              </p>
            </div>

            {/* 3. Owner */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">3. Owner Dashboard</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Manage menu prices and categories, toggle in-stock / sold-out status, generate table QR stand cards with printable views, and view real-time sales summaries.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Real-Time Order Flow Step-by-Step */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-amber-400" />
            The Real-Time Order Lifecycle
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <div>
                <strong className="text-white block font-bold">Customer Scans Table QR Code</strong>
                <span className="text-slate-400">
                  The URL contains the verified restaurant ID and table identifier. Menu items are fetched from Firestore.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <div>
                <strong className="text-white block font-bold">Trusted Server-Side Price Validation</strong>
                <span className="text-slate-400">
                  Before the order is written, <code className="text-amber-400">restaurantService.validateAndSubmitOrder</code> fetches the official menu catalog. Client prices are never trusted. Line totals, tax, and grand total are authenticated.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0">
                3
              </span>
              <div>
                <strong className="text-white block font-bold">Atomic Firestore Order Write</strong>
                <span className="text-slate-400">
                  Order is committed to <code className="text-amber-400">/restaurants/{'{restaurantId}'}/orders/{'{orderId}'}</code> with initial status <code className="text-amber-400">'new'</code>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0">
                4
              </span>
              <div>
                <strong className="text-white block font-bold">Real-time Kitchen Alert & Speech Synthesis</strong>
                <span className="text-slate-400">
                  The Kitchen dashboard's <code className="text-amber-400">onSnapshot</code> listener triggers instantly without page refresh. The audio synthesizer rings a chime, and the speech engine announces: <em>"New order received. Table 5. Two masala dosas and one chai."</em>
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center flex-shrink-0">
                5
              </span>
              <div>
                <strong className="text-white block font-bold">Kitchen Status Transition & Customer Live Tracker</strong>
                <span className="text-slate-400">
                  Kitchen staff clicks "Start Cooking" or "Mark Ready". The customer's mobile screen tracker updates simultaneously.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Database Schema and Security Model */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Database Model & Security Hardening
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono">
              <h4 className="text-amber-400 font-bold font-sans mb-2 flex items-center gap-1.5">
                <FolderTree className="w-4 h-4" />
                Firestore Document Collections
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                <li>📂 <span className="text-white">/restaurants/{'{restaurantId}'}</span></li>
                <li className="pl-4">├── 📁 <span className="text-emerald-400">/menu_items/{'{itemId}'}</span></li>
                <li className="pl-4">├── 📁 <span className="text-cyan-400">/tables/{'{tableId}'}</span></li>
                <li className="pl-4">└── 📁 <span className="text-amber-400">/orders/{'{orderId}'}</span></li>
              </ul>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 space-y-2">
              <h4 className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Zero-Trust Security Guarantees
              </h4>
              <p className="text-[11px] leading-relaxed">
                • <strong>Owner Isolation:</strong> Only the authenticated owner can create, edit, or delete menu items and dining tables.
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong>Customer Order Guard:</strong> Guests can create orders only with status strictly set to <code className="text-amber-400">'new'</code>.
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong>Kitchen Exclusivity:</strong> Status progression to <code className="text-amber-400">'preparing'</code>, <code className="text-amber-400">'ready'</code>, and <code className="text-amber-400">'served'</code> is restricted to restaurant staff.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Voice Announcement Technical Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            SpeechSynthesis API & Autoplay Handling
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <strong className="text-white block font-bold mb-1">Deduplication</strong>
              <p className="text-slate-400">
                Orders are tracked in an in-memory session set. When the kitchen screen is opened or refreshed, existing orders are never repeated.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <strong className="text-white block font-bold mb-1">Browser Autoplay Unlock</strong>
              <p className="text-slate-400">
                Modern browsers block audio before user interaction. SmartServe provides a clear interactive banner and pre-warms the AudioContext on the first tap.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <strong className="text-white block font-bold mb-1">Visual Fallback</strong>
              <p className="text-slate-400">
                If the device has muted speakers or lacks speech synthesis support, glowing cards and a persistent notification bar ensure no order is ever missed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
