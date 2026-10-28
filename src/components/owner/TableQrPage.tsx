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
            width: 320,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
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
  const handleToggleActive = async (table: RestaurantTable) => {
    try {
      await restaurantService.saveTable(restaurant.id, {
        ...table,
        isActive: !table.isActive,
      });
      await loadTables();
    } catch (err) {
      console.error('Failed to toggle table status:', err);
    }
  };

  // Delete table
  const handleDeleteTable = async (tableId: string, tblNum: string) => {
    if (confirm(`Delete Table ${tblNum}? Existing QR stand cards for this table will be deactivated.`)) {
      await restaurantService.deleteTable(restaurant.id, tableId);
      await loadTables();
    }
  };

  // Add Table submit
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setIsSaving(true);
    try {
      const tableId = `tbl-${Date.now()}`;
      const newTable: RestaurantTable = {
        id: tableId,
        restaurantId: restaurant.id,
        tableNumber: tableNumber.trim(),
        tableName: tableName.trim() || `Table ${tableNumber.trim()}`,
        capacity: parseInt(capacity) || 4,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await restaurantService.saveTable(restaurant.id, newTable);
      setIsAddModalOpen(false);
      setTableNumber('');
      setTableName('');
      setCapacity('4');
      await loadTables();
    } catch (err) {
      alert('Failed to add table.');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed default 6 tables
  const handleSeedTables = async () => {
    const presets: RestaurantTable[] = [
      { id: 'tbl-1', restaurantId: restaurant.id, tableNumber: '1', tableName: 'Patio Sun Table 1', capacity: 2, isActive: true },
      { id: 'tbl-2', restaurantId: restaurant.id, tableNumber: '2', tableName: 'Indoor Center Table 2', capacity: 4, isActive: true },
      { id: 'tbl-3', restaurantId: restaurant.id, tableNumber: '3', tableName: 'Window Booth Table 3', capacity: 4, isActive: true },
      { id: 'tbl-4', restaurantId: restaurant.id, tableNumber: '4', tableName: 'Family Banquet Table 4', capacity: 6, isActive: true },
    ];
    for (const t of presets) {
      await restaurantService.saveTable(restaurant.id, t);
    }
    await loadTables();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Table QR System
            </span>
            <span className="text-xs text-slate-400">Stable Permanent URLs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <QrCode className="w-8 h-8 text-amber-400" />
            Table QR Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate permanent, scannable QR codes for your dining tables. Changing dishes, prices, or descriptions will never require regenerating these codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tables.length === 0 && (
            <button
              onClick={handleSeedTables}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seed Tables (1-4)</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Dining Table</span>
          </button>
        </div>
      </div>

      {/* Stability Note */}
      <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Stable QR Guarantee:</strong> Each QR contains the permanent table and restaurant identifiers. When scanned, it loads the current database menu dynamically in real time.
        </p>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
          <span className="text-xs">Generating table QR codes...</span>
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
          <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No dining tables created yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add your tables to generate printable QR stand cards for guest seating.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl hover:bg-amber-400"
          >
            + Add First Dining Table
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tables.map((table) => {
            const qrImage = qrMap.get(table.id);
            const stableUrl = `${window.location.origin}/?restaurant=${encodeURIComponent(restaurant.id)}&table=${encodeURIComponent(table.id)}`;
            const isCopied = copiedTableId === table.id;

            return (
              <div
                key={table.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg ${
                  table.isActive
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-slate-800/40 opacity-60 bg-slate-900/40'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex flex-col items-center justify-center font-black shadow-inner">
                        <span className="text-[9px] uppercase font-bold leading-none">Table</span>
                        <span className="text-xl leading-tight font-black">{table.tableNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base leading-snug">{table.tableName}</h3>
                        <p className="text-[11px] text-slate-400">Capacity: {table.capacity} Guests</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(table)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        table.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                      title="Click to toggle table active/inactive"
                    >
                      {table.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* QR Image preview */}
                  <div className="bg-white rounded-xl p-3 flex flex-col items-center justify-center shadow-inner my-2">
                    {qrImage ? (
                      <img
                        src={qrImage}
                        alt={`QR Code for Table ${table.tableNumber}`}
                        className="w-36 h-36 object-contain"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                        Generating...
                      </div>
                    )}
                    <p className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                      Scan with phone camera
                    </p>
                  </div>

                  {/* Permanent URL readout */}
                  <div className="mt-3 p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[10px] text-amber-400">{stableUrl}</span>
                    <button
                      onClick={() => handleCopyLink(table)}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex-shrink-0"
                      title="Copy customer menu link"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setPreviewTable(table)}
                    className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Card</span>
                  </button>

                  <button
                    onClick={() => handleDownloadQr(table)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                    title="Download PNG image"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    onClick={() => onOpenCustomerTable(table.id)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                    title="Simulate Customer Scanning this Table"
                  >
                    <Eye className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                    className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-slate-800"
                    title="Delete Table"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-lg text-white mb-1">Add Dining Table</h3>
            <p className="text-xs text-slate-400 mb-4">
              Creates a unique table record and permanent QR code link.
            </p>

            <form onSubmit={handleAddTable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5, 6, Patio-1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Table Friendly Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Garden Terrace Booth 5"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Guest Seating Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
                >
                  {isSaving ? 'Creating Table...' : 'Create Table & QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Card Modal */}
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
