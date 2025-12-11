import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ChartProps {
  ticker: string;
}

export default function StockChart({ ticker }: ChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [trend, setTrend] = useState<'up' | 'down'>('up');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const res = await fetch(`/api/chart?ticker=${ticker}`);
        const json = await res.json();
        if (json.success && isMounted) {
          setData(json.data);
          setTrend(json.trend);
        }
      } catch (e) {
        console.error("Chart error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false };
  }, [ticker]);

  if (loading) return (
    <div className="h-48 w-full flex items-center justify-center bg-slate-950/50 rounded-lg animate-pulse">
      <span className="text-slate-600 text-xs font-mono">LOADING CHART DATA...</span>
    </div>
  );

  if (data.length === 0) return (
    <div className="h-48 w-full flex items-center justify-center bg-slate-950/50 rounded-lg">
      <span className="text-slate-600 text-xs">Chart Unavailable</span>
    </div>
  );

  const color = trend === 'up' ? '#10b981' : '#f43f5e';
  const gradientId = `colorGradient-${ticker}`;

  return (
    <div className="h-64 w-full bg-slate-950/30 rounded-lg p-2 border border-slate-800" data-testid={`chart-${ticker}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <XAxis 
            dataKey="date" 
            hide={true}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            hide={true}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
            itemStyle={{ color: color }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
