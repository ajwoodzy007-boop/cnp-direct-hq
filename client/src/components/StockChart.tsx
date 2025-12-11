import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';
import Skeleton from './Skeleton';

interface ChartProps {
  ticker: string;
}

export default function StockChart({ ticker }: ChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [trend, setTrend] = useState<'up' | 'down'>('up');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const res = await fetch(`/api/chart?ticker=${ticker}`);
        
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        
        const json = await res.json();
        
        if (json.success && isMounted) {
          setData(json.data);
          setTrend(json.trend);
        } else {
          setError("No data returned");
        }
      } catch (e: any) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false };
  }, [ticker]);

  if (error) return (
    <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-950/30 rounded-lg border border-red-900/30">
      <span className="text-red-400 text-xs font-bold mb-2">CHART ERROR</span>
      <span className="text-slate-500 text-xs">{error}</span>
    </div>
  );

  if (loading) return (
    <div className="h-72 w-full bg-slate-950/30 rounded-lg p-4 border border-slate-800 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-4 px-1">
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-3 w-6" />
        <Skeleton className="h-3 w-6" />
      </div>
      <div className="ml-10 h-full flex items-end gap-2">
        <Skeleton className="h-[40%] w-full rounded-t opacity-20" />
        <Skeleton className="h-[60%] w-full rounded-t opacity-40" />
        <Skeleton className="h-[80%] w-full rounded-t opacity-60" />
        <Skeleton className="h-[50%] w-full rounded-t opacity-30" />
        <Skeleton className="h-[70%] w-full rounded-t opacity-50" />
      </div>
    </div>
  );

  if (data.length === 0) return (
    <div className="h-64 w-full flex items-center justify-center bg-slate-950/30 rounded-lg">
      <span className="text-slate-600 text-xs">No Price History Available</span>
    </div>
  );

  const color = trend === 'up' ? '#10b981' : '#f43f5e';
  const gradientId = `colorGradient-${ticker}`;

  return (
    <div className="h-72 w-full bg-slate-950/30 rounded-lg p-4 border border-slate-800" data-testid={`chart-${ticker}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />

          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickMargin={10}
            minTickGap={30}
          />

          <YAxis 
            domain={['auto', 'auto']} 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={(value) => `$${Math.round(value)}`}
            width={40}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
            itemStyle={{ color: color }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#${gradientId})`} 
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
