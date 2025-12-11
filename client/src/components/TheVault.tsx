import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus } from 'lucide-react';

export default function TheVault() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTicker, setNewTicker] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newShares, setNewShares] = useState('10');

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/vault');
      const json = await res.json();
      if (json.success) setPositions(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/vault/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ticker: newTicker.toUpperCase(), 
        price: newPrice, 
        shares: newShares, 
        type: 'SHARE' 
      })
    });
    setShowAddModal(false);
    fetchPortfolio();
    setNewTicker('');
    setNewPrice('');
    setNewShares('10');
  };

  const totalEquity = positions.reduce((acc, p) => acc + (p.marketValue || 0), 0);
  const totalGain = positions.reduce((acc, p) => acc + (p.gain || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="text-emerald-400 h-8 w-8" />
            The Vault
          </h2>
          <p className="text-slate-400 mt-2">Paper Trading & Portfolio Tracking</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
          data-testid="button-log-trade"
        >
          <Plus className="h-5 w-5" /> Log Trade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-500 text-xs font-bold uppercase mb-2">Total Equity</div>
          <div className="text-3xl font-bold text-white" data-testid="text-total-equity">
            ${totalEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-500 text-xs font-bold uppercase mb-2">Total Gain/Loss</div>
          <div className={`text-3xl font-bold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-total-gain">
            {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString(undefined, {minimumFractionDigits: 2})}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="text-slate-500 text-xs font-bold uppercase mb-2">Open Positions</div>
          <div className="text-3xl font-bold text-white" data-testid="text-position-count">{positions.length}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 font-bold text-white">Active Holdings</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-950">
              <tr>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3">Entry</th>
                <th className="px-6 py-3">Current</th>
                <th className="px-6 py-3">Shares</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3">P/L %</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50" data-testid={`row-position-${p.ticker}`}>
                  <td className="px-6 py-4 font-bold text-white">{p.ticker}</td>
                  <td className="px-6 py-4 text-slate-400">${(p.averageCost || p.entryPrice || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 text-white">${p.currentPrice?.toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-400">{p.shares}</td>
                  <td className="px-6 py-4 text-white font-mono">${p.marketValue?.toLocaleString()}</td>
                  <td className={`px-6 py-4 font-bold ${p.gainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.gainPercent > 0 ? '+' : ''}{p.gainPercent?.toFixed(2)}%
                  </td>
                </tr>
              ))}
              {positions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Vault is empty. Log a trade to begin tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Log New Position</h3>
            <form onSubmit={handleAddTrade} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase font-bold">Ticker</label>
                <input 
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white uppercase"
                  value={newTicker} onChange={e => setNewTicker(e.target.value)} required 
                  data-testid="input-new-ticker"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Entry Price</label>
                  <input 
                    type="number" step="0.01"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    value={newPrice} onChange={e => setNewPrice(e.target.value)} required 
                    data-testid="input-new-price"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold">Quantity</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    value={newShares} onChange={e => setNewShares(e.target.value)} required 
                    data-testid="input-new-shares"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="flex-1 bg-slate-800 text-white py-2 rounded"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-emerald-600 text-white py-2 rounded font-bold"
                  data-testid="button-secure-asset"
                >
                  Secure Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
