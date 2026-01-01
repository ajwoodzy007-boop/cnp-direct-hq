import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  ticker: string;
}

// ⚡ THE FIX: "export default" to match the import in MarketRadar.tsx
export default function StockChart({ ticker }: StockChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["chart-data", ticker],
    queryFn: async () => {
      // ⚡ DIRECT LINK: Bypass proxy to kill 404s
      const url = `http://localhost:5000/api/chart?ticker=${ticker.toUpperCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: !!ticker,
  });

  if (isLoading) return <div className="h-[200px] bg-slate-900/50 animate-pulse rounded-xl" />;
  
  if (error || !data?.success) {
    return (
      <div className="h-[200px] flex items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-600 text-[10px] font-mono">
        {ticker} // VAULT CONNECTION ERROR
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-2 animate-in fade-in duration-500">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} strokeOpacity={0.3} />
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '4px' }}
            itemStyle={{ color: '#06b6d4', fontSize: '10px' }}
          />
          <Line type="monotone" dataKey="close" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}