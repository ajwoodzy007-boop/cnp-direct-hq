import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  ticker: string;
}

export default function StockChart({ ticker }: StockChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["chart-data", ticker],
    queryFn: async () => {
      // Use relative path for seamless Local/Railway switching
      const url = `/api/chart?ticker=${ticker.toUpperCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!ticker,
  });

  if (isLoading) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center space-y-2 bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="h-4 w-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Accessing Vault...</span>
      </div>
    );
  }
  
  if (error || !data?.success || !data?.data || data.data.length === 0) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 px-4 text-center">
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-[0.3em] mb-2">
          {ticker} // DATA LINK SEVERED
        </span>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-4 animate-in fade-in zoom-in-95 duration-1000">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.4} />
          <XAxis dataKey="date" hide />
          <YAxis 
            domain={['auto', 'auto']} 
            orientation="right"
            tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold', fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `$${val.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px' }}
            itemStyle={{ color: '#06b6d4', fontSize: '11px', fontWeight: '900' }}
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Price']}
          />
          <Line type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}