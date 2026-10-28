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
  Smartphone,
  ShieldCheck,
  ExternalLink,
  Users,
  CheckCircle2,
  Power,
  Globe,
} from 'lucide-react';
import { Restaurant, RestaurantTable } from '../../types';
import { restaurantService } from '../../services/restaurantService';
import { PrintableTableCard } from './PrintableTableCard';
import { APP_CONFIG } from '../../config/appConfig';

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

  // Load tables & generate stable QR codes using the production base URL
  const loadTables = async () => {
    setLoading(true);
    try {
      const list = await restaurantService.getTables(restaurant.id);
      setTables(list);

      // Generate QR codes for all tables using the PERMANENT PRODUCTION BASE URL:
      // https://smart-serve-peach.vercel.app/?restaurant=...&table=...
      const newMap = new Map<string, string>();
      for (const t of list) {
        const canonicalUrl = APP_CONFIG.getCustomerTableUrl(restaurant.id, t.id);
        try {
          const dataUrl = await QRCode.toDataURL(canonicalUrl, {
            width: 360,
            margin: 2,
            color: { dark: '#0F172A', light: '#FFFFFF' },
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

  // Copy canonical production link to clipboard
  const handleCopyLink = (table: RestaurantTable) => {
    const canonicalUrl = APP_CONFIG.getCustomerTableUrl(restaurant.id, table.id);
    navigator.clipboard.writeText(canonicalUrl);
    setCopiedTableId(table.id);
    setTimeout(() => setCopiedTableId(null), 2500);
  };

  // Download high-resolution QR code PNG
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                FLOOR PLAN & QR STANDS
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {tables.length} tables configured
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Table QR Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Every table has a permanent URL with high-res PNG export and printable stand card templates.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Table</span>
          </button>
        </div>

        {/* Permanent Production URL Notice Banner */}
        <div className="p-3 sm:p-3.5 bg-white border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs overflow-hidden">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 block sm:inline">Production QR Endpoint: </span>
              <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[10px] sm:text-[11px] border border-slate-200 break-all inline-block mt-1 sm:mt-0">
                {APP_CONFIG.PRODUCTION_BASE_URL}/?restaurant={restaurant.id}&table=[TABLE_ID]
              </code>
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 self-start sm:self-auto">
            ✓ Direct Vercel Routing
          </span>
        </div>

        {/* Copy Toast banner if link copied */}
        {copiedTableId && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Production table ordering URL copied to clipboard! Ready to paste into any mobile browser.</span>
            </div>
          </div>
        )}

        {/* Tables Grid */}
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading restaurant tables...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/90 p-8 max-w-md mx-auto shadow-2xs">
            <QrCode className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No tables added yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Add your restaurant tables to generate dedicated QR codes for guest ordering.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 shadow-sm"
            >
              Add Table #1
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((table) => {
              const qrDataUrl = qrMap.get(table.id);
              const canonicalUrl = APP_CONFIG.getCustomerTableUrl(restaurant.id, table.id);

              return (
                <div
                  key={table.id}
                  className={`flex flex-col justify-between rounded-3xl bg-white border transition-all duration-200 shadow-sm overflow-hidden saas-card-hover ${
                    table.isActive ? 'border-slate-200/90' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  {/* Table Card Header */}
                  <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black flex flex-col items-center justify-center shadow-2xs">
                        <span className="text-[9px] uppercase font-bold leading-none">Table</span>
                        <span className="text-lg leading-tight font-black">{table.tableNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{table.tableName || `Table ${table.tableNumber}`}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
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
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                      }`}
                      title={table.isActive ? 'Table is accepting orders' : 'Table is paused/disabled'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${table.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span>{table.isActive ? 'Active' : 'Disabled'}</span>
                    </button>
                  </div>

                  {/* QR Code Presentation Box */}
                  <div className="p-6 flex flex-col items-center justify-center bg-white">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 relative group">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt={`QR Code for Table ${table.tableNumber}`} className="w-44 h-44 object-contain" />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    <p className="font-mono text-[10px] text-slate-500 mt-3 truncate max-w-[280px]">
                      {canonicalUrl}
                    </p>
                  </div>

                  {/* Action Toolbar */}
                  <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(table)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
                        title="Copy direct production ordering URL"
                      >
                        {copiedTableId === table.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>

                      {/* Download PNG */}
                      <button
                        onClick={() => handleDownloadQr(table)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
                        title="Download high-resolution PNG QR image"
                      >
                        <Download className="w-4 h-4 text-amber-600" />
                      </button>

                      {/* Print Card */}
                      <button
                        onClick={() => setPreviewTable(table)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
                        title="Open print-ready acrylic table stand card"
                      >
                        <Printer className="w-4 h-4 text-blue-600" />
                      </button>

                      {/* Delete Table */}
                      <button
                        onClick={() => handleDeleteTable(table.id)}
                        className="p-2 rounded-xl bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors border border-slate-200 shadow-2xs"
                        title="Delete table and QR code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Test Order as Customer */}
                    <button
                      onClick={() => onOpenCustomerTable(table.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      <span>Test Order</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600" />
                Add Restaurant Table
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 or Patio-2"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Table Label / Zone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Window Booth or Rooftop"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
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
