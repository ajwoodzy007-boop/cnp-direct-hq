import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import StockChart from './StockChart';

export default function MarketRadar() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { data: briefing, isLoading: loadingBriefing } = useQuery({
    queryKey: ["briefing"],
    queryFn: async () => {
      const res = await fetch("/api/academy/briefing");
      if (!res.ok) throw new Error("Briefing Offline");
      return res.json();
    }
  });

  const { data: radarData, isLoading: loadingRadar } = useQuery({
    queryKey: ["market", "sentinel"],
    queryFn: async () => {
      const res = await fetch("/api/market/sentinel");
      if (!res.ok) throw new Error("Radar Offline");
      return res.json();
    }
  });

  // Use the same data structure as Command Center when API returns empty
  const displayMovers = radarData?.data?.length > 0 ? radarData.data : [
    { ticker: 'SPY', price: 478.50, changePercent: 1.2 },
    { ticker: 'QQQ', price: 418.75, changePercent: -0.8 },
    { ticker: 'AAPL', price: 180.50, changePercent: 2.3 },
    { ticker: 'TSLA', price: 245.20, changePercent: -1.8 },
    { ticker: 'NVDA', price: 875.30, changePercent: 5.7 },
    { ticker: 'BTC-USD', price: 95200, changePercent: 3.2 },
    { ticker: 'ETH-USD', price: 3280, changePercent: 1.8 }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
        <h3 className="text-cyan-500 font-black text-xs uppercase tracking-widest mb-2">System Briefing</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          {loadingBriefing ? "Decrypting..." : briefing?.data?.summary}
        </p>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/80">
            <tr>
              <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ticker</th>
              <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Price</th>
              <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {displayMovers?.map((stock: any) => (
              <React.Fragment key={stock.ticker}>
                <tr 
                  onClick={() => setSelectedTicker(selectedTicker === stock.ticker ? null : stock.ticker)}
                  className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono text-cyan-500 font-bold">{stock.ticker}</td>
                  <td className="p-3 text-slate-300">${(stock.price || 0).toFixed(2)}</td>
                  <td className={`p-3 font-bold ${(stock.changePercent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {(stock.changePercent || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                  </td>
                </tr>
                {selectedTicker === stock.ticker && (
                  <tr>
                    <td colSpan={3} className="p-4 bg-slate-900/20">
                      <StockChart ticker={stock.ticker} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}