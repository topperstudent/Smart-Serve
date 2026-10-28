import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Plus,
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  X,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ExternalLink,
  Users,
  CheckCircle2,
  Power,
} from 'lucide-react';
import { Restaurant, RestaurantTable } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { PrintableTableCard } from './PrintableTableCard';

interface TableQrPageProps {
  restaurant: Restaurant;
  onOpenCustomerTable: (tableId: string) => void;
}

export const TableQrPage: React.FC<TableQrPageProps> = ({
  restaurant,
  onOpenCustomerTable,
}) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrMap, setQrMap] = useState<Map<string, string>>(new Map());
  const [copiedTableId, setCopiedTableId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewTable, setPreviewTable] = useState<RestaurantTable | null>(null);

  // Form
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [isSaving, setIsSaving] = useState(false);

  // Load tables
  const loadTables = async () => {
    setLoading(true);
    try {
      const list = await restaurantService.getTables(restaurant.id);
      setTables(list);

      // Generate QR codes for all tables using stable URL
      const newMap = new Map<string, string>();
      for (const t of list) {
        const stableUrl = `${window.location.origin}/?restaurant=${encodeURIComponent(restaurant.id)}&table=${encodeURIComponent(t.id)}`;
        try {
          const dataUrl = await QRCode.toDataURL(stableUrl, {
            width: 360,
            margin: 2,
            color: { dark: '#090D16', light: '#FFFFFF' },
          });
          newMap.set(t.id, dataUrl);
        } catch (e) {
          console.warn('QR gen error for table:', t.id, e);
        }
      }
      setQrMap(newMap);
    } catch (e) {
      console.error('Failed to load tables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [restaurant.id]);

  // Copy permanent link to clipboard
  const handleCopyLink = (table: RestaurantTable) => {
    const stableUrl = `${window.location.origin}/?restaurant=${encodeURIComponent(restaurant.id)}&table=${encodeURIComponent(table.id)}`;
    navigator.clipboard.writeText(stableUrl);
    setCopiedTableId(table.id);
    setTimeout(() => setCopiedTableId(null), 2500);
  };

  // Download QR code PNG
  const handleDownloadQr = (table: RestaurantTable) => {
    const dataUrl = qrMap.get(table.id);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${restaurant.name.replace(/\s+/g, '_')}_Table_${table.tableNumber}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Toggle table active/inactive
  const handleToggleTable = async (table: RestaurantTable) => {
    try {
      const nextActive = !table.isActive;
      await restaurantService.saveTable(restaurant.id, {
        ...table,
        isActive: nextActive,
      });
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, isActive: nextActive } : t))
      );
    } catch (e) {
      console.error('Failed to toggle table status:', e);
    }
  };

  // Delete table
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table and its assigned QR code?')) return;
    try {
      await restaurantService.deleteTable(restaurant.id, tableId);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch (e) {
      console.error('Failed to delete table:', e);
    }
  };

  // Add new table
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setIsSaving(true);
    try {
      const newTable: RestaurantTable = {
        id: `t-${tableNumber.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        restaurantId: restaurant.id,
        tableNumber: tableNumber.trim(),
        tableName: tableName.trim() || `Table ${tableNumber.trim()}`,
        capacity: parseInt(capacity) || 4,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await restaurantService.saveTable(restaurant.id, newTable);
      await loadTables();
      setIsAddModalOpen(false);
      setTableNumber('');
      setTableName('');
    } catch (e) {
      console.error('Failed to add table:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A0F] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                FLOOR PLAN & QR STANDS
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-xs text-slate-400 font-medium">
                {tables.length} tables configured
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Table QR Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Every table has a permanent URL with high-res PNG export and printable stand card templates.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Table</span>
          </button>
        </div>

        {/* Copy Toast banner if link copied */}
        {copiedTableId && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 shadow-xl animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Direct customer ordering URL copied to clipboard! You can paste or test it in any browser.</span>
            </div>
          </div>
        )}

        {/* Tables Grid */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading restaurant tables...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.08] p-8 max-w-md mx-auto">
            <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No tables added yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Add your restaurant tables to generate dedicated QR codes for guest ordering.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl"
            >
              Add Table #1
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => {
              const qrDataUrl = qrMap.get(table.id);
              const stableUrl = `${window.location.origin}/?restaurant=${encodeURIComponent(restaurant.id)}&table=${encodeURIComponent(table.id)}`;

              return (
                <div
                  key={table.id}
                  className={`flex flex-col justify-between rounded-3xl bg-[#0F172A] border transition-all duration-200 shadow-xl overflow-hidden glass-card-hover ${
                    table.isActive ? 'border-white/[0.08]' : 'border-slate-800 opacity-60 bg-slate-950/80'
                  }`}
                >
                  {/* Table Card Header */}
                  <div className="p-5 flex items-center justify-between border-b border-white/[0.06] bg-slate-900/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-black flex flex-col items-center justify-center shadow-md">
                        <span className="text-[9px] uppercase font-bold leading-none">Table</span>
                        <span className="text-lg leading-tight font-black">{table.tableNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{table.tableName || `Table ${table.tableNumber}`}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span>{table.capacity || 4} Guests</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active/Inactive Toggle Pill */}
                    <button
                      onClick={() => handleToggleTable(table)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                        table.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                      }`}
                      title={table.isActive ? 'Table is accepting orders' : 'Table is paused/disabled'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${table.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      <span>{table.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* QR Code Presentation Box */}
                  <div className="p-6 flex flex-col items-center justify-center bg-slate-950/60">
                    <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-amber-500/20 relative group">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt={`QR Code for Table ${table.tableNumber}`} className="w-44 h-44 object-contain" />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <p className="font-mono text-[10px] text-slate-500 mt-3 truncate max-w-[280px]">
                      {stableUrl}
                    </p>
                  </div>

                  {/* Action Toolbar */}
                  <div className="p-4 bg-slate-900/80 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(table)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/[0.08]"
                        title="Copy direct guest ordering URL"
                      >
                        {copiedTableId === table.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {/* Download PNG */}
                      <button
                        onClick={() => handleDownloadQr(table)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/[0.08]"
                        title="Download high-resolution PNG QR image"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                      </button>

                      {/* Print Card */}
                      <button
                        onClick={() => setPreviewTable(table)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-white/[0.08]"
                        title="Open print-ready acrylic table stand card"
                      >
                        <Printer className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>

                    {/* Test Order as Customer */}
                    <button
                      onClick={() => onOpenCustomerTable(table.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <span>Test Order</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/[0.12] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                Add Restaurant Table
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 or Patio-2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Table Label / Zone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Window Booth or Rooftop"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                  <span>Generate QR Code</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Table Card Modal */}
      {previewTable && (
        <PrintableTableCard
          restaurant={restaurant}
          table={previewTable}
          onClose={() => setPreviewTable(null)}
        />
      )}
    </div>
  );
};
