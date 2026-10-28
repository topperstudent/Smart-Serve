import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, X, Smartphone, QrCode } from 'lucide-react';
import { Restaurant, RestaurantTable } from '../../types';
import { APP_CONFIG } from '../../config/appConfig';

interface PrintableTableCardProps {
  restaurant: Restaurant;
  table: RestaurantTable;
  onClose: () => void;
}

export const PrintableTableCard: React.FC<PrintableTableCardProps> = ({
  restaurant,
  table,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Stable customer QR URL using the PERMANENT PRODUCTION BASE URL:
  // https://smart-serve-peach.vercel.app/?restaurant=...&table=...
  const menuUrl = APP_CONFIG.getCustomerTableUrl(restaurant.id, table.id);

  useEffect(() => {
    QRCode.toDataURL(menuUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR:', err));
  }, [menuUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${restaurant.name.replace(/\s+/g, '_')}_Table_${table.tableNumber}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-amber-600" />
          <h3 className="font-extrabold text-slate-900 text-base">Table QR Stand Preview</h3>
        </div>

        {/* Printable Card Tent View */}
        <div id="printable-card" className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 text-center shadow-sm border-2 border-slate-200">
          <div className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 rounded-full text-amber-800 text-[11px] font-extrabold tracking-wider uppercase mb-2">
            SmartServe Contactless Dining
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            {restaurant.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {restaurant.tagline || 'Scan. Order. Serve.'}
          </p>

          {/* Table Number Badge */}
          <div className="my-4 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-xl shadow-sm">
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">TABLE</span>
            <span className="text-2xl font-black">{table.tableNumber}</span>
          </div>

          {/* QR Code */}
          <div className="w-56 h-56 mx-auto bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-center shadow-inner">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for Table ${table.tableNumber}`}
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <div className="text-xs text-slate-400">Generating QR...</div>
            )}
          </div>

          <div className="mt-4 space-y-1">
            <p className="font-bold text-sm text-slate-900 flex items-center justify-center gap-1.5">
              <Smartphone className="w-4 h-4 text-amber-600" />
              Point your phone camera to view menu
            </p>
            <p className="text-[11px] text-slate-500 font-mono break-all px-2">
              {menuUrl}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              No app download or account needed • Direct kitchen ordering
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Table ID: {table.id}</span>
            <span>WiFi Available</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Download QR PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Stand Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
