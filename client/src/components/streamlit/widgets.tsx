import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";

// --- Typography ---

export function StTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="scroll-m-20 text-4xl font-bold tracking-tight mb-6">{children}</h1>;
}

export function StHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-10 mb-4 pb-2 border-b border-border">{children}</h2>;
}

export function StSubheader({ children }: { children: React.ReactNode }) {
  return <h3 className="scroll-m-20 text-xl font-medium tracking-tight mt-6 mb-3">{children}</h3>;
}

export function StText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("leading-7 [&:not(:first-child)]:mt-4 text-muted-foreground", className)}>{children}</p>;
}

export function StCodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 mb-6 overflow-x-auto rounded-lg bg-muted/50 p-4 border border-border">
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
        {children}
      </code>
    </pre>
  );
}

// --- Metrics ---

export function StMetric({ label, value, delta, deltaType = "neutral" }: { label: string; value: string; delta?: string; deltaType?: "positive" | "negative" | "neutral" }) {
  return (
    <div className="flex flex-col p-4">
      <span className="text-sm font-medium text-muted-foreground mb-1">{label}</span>
      <span className="text-3xl font-bold tracking-tight">{value}</span>
      {delta && (
        <span className={cn("text-sm font-medium mt-1 flex items-center gap-1", {
          "text-green-600 dark:text-green-400": deltaType === "positive",
          "text-red-600 dark:text-red-400": deltaType === "negative",
          "text-muted-foreground": deltaType === "neutral",
        })}>
          {deltaType === "positive" ? "↑" : deltaType === "negative" ? "↓" : "•"} {delta}
        </span>
      )}
    </div>
  );
}

// --- Dataframes ---

export function StDataFrame({ data, columns }: { data: any[]; columns: string[] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden my-4 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-medium border-b border-border w-12 text-center">#</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-medium border-b border-border">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2 text-center text-muted-foreground border-r border-border/50 bg-muted/10">
                  {idx}
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 whitespace-nowrap">
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Inputs ---

export function StSelect({ label, options, value, onChange, help }: { label: string; options: string[]; value?: string; onChange?: (val: string) => void; help?: string }) {
  return (
    <div className="space-y-2 mb-6">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
        {help && (
          <div className="text-muted-foreground hover:text-foreground cursor-help" title={help}>
            <InformationCircleIcon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function StSlider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number[]; onChange: (val: number[]) => void }) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value[0]}</span>
      </div>
      <Slider
        defaultValue={value}
        max={max}
        min={min}
        step={step}
        onValueChange={onChange}
        className="[&>.absolute]:bg-primary"
      />
    </div>
  );
}

export function StCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <Switch id={label} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={label} className="text-sm font-medium leading-none cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

// --- Charts ---

export function StLineChart({ data, dataKey, categories }: { data: any[]; dataKey: string; categories: string[] }) {
  return (
    <div className="h-[350px] w-full mt-4 mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            {categories.map((cat, i) => (
              <linearGradient key={cat} id={`color${cat}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0.3} />
                <stop offset="95%" stopColor={`var(--chart-${i + 1})`} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey={dataKey} 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--popover)', 
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--popover-foreground)',
              boxShadow: 'var(--shadow-md)'
            }}
          />
          {categories.map((cat, i) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={`var(--chart-${i + 1})`}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#color${cat})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StBarChart({ data, dataKey, categories }: { data: any[]; dataKey: string; categories: string[] }) {
  return (
    <div className="h-[350px] w-full mt-4 mb-8">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey={dataKey} 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <YAxis 
            stroke="var(--muted-foreground)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
            contentStyle={{ 
              backgroundColor: 'var(--popover)', 
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--popover-foreground)'
            }}
          />
          {categories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              fill={`var(--chart-${i + 1})`}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
