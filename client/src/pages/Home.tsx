import React, { useState } from "react";
import { StreamlitLayout } from "@/components/streamlit/layout";
import {
  StTitle,
  StHeader,
  StSubheader,
  StText,
  StCodeBlock,
  StMetric,
  StDataFrame,
  StSelect,
  StSlider,
  StCheckbox,
  StLineChart,
  StBarChart
} from "@/components/streamlit/widgets";
import heroImage from '@assets/generated_images/abstract_data_visualization_with_flowing_lines_and_particles_in_coral_and_gray.png';

// Mock Data
const SALES_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  revenue: Math.floor(Math.random() * 5000) + 2000,
  profit: Math.floor(Math.random() * 3000) + 1000,
  customers: Math.floor(Math.random() * 200) + 50,
}));

const DATAFRAME_DATA = [
  { id: 101, asset: "BTC/USD", signal: "Strong Buy", sentiment: "Bullish", volume: "1.2B" },
  { id: 102, asset: "ETH/USD", signal: "Buy", sentiment: "Bullish", volume: "850M" },
  { id: 103, asset: "SOL/USD", signal: "Hold", sentiment: "Neutral", volume: "430M" },
  { id: 104, asset: "XRP/USD", signal: "Sell", sentiment: "Bearish", volume: "210M" },
  { id: 105, asset: "ADA/USD", signal: "Strong Sell", sentiment: "Bearish", volume: "89M" },
];

export default function Home() {
  // State for controls
  const [selectedRegion, setSelectedRegion] = useState("North America");
  const [priceRange, setPriceRange] = useState([50]);
  const [showProfit, setShowProfit] = useState(true);
  const [showCode, setShowCode] = useState(false);

  // Filter logic (mock)
  const filteredData = SALES_DATA.map(d => ({
    ...d,
    revenue: d.revenue * (priceRange[0] / 50), // Simple mock impact
  }));

  const SidebarContent = (
    <>
      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Configuration</h3>
        <StSelect
          label="Select Region"
          options={["North America", "Europe", "Asia Pacific", "Global"]}
          value={selectedRegion}
          onChange={setSelectedRegion}
          help="Filters the dataset by sales region."
        />
        <StSlider
          label="Price Threshold ($)"
          min={0}
          max={100}
          step={1}
          value={priceRange}
          onChange={setPriceRange}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">View Options</h3>
        <StCheckbox
          label="Show Profit Margin"
          checked={showProfit}
          onChange={setShowProfit}
        />
        <StCheckbox
          label="Show Source Code"
          checked={showCode}
          onChange={setShowCode}
        />
      </div>

      <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
        <p className="text-xs text-primary font-medium">
          💡 Tip: You can toggle the sidebar visibility using the menu icon in the top left.
        </p>
      </div>
    </>
  );

  return (
    <StreamlitLayout sidebar={SidebarContent}>
      {/* Hero Header */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden mb-8 group">
        <img 
          src={heroImage} 
          alt="Dashboard Hero" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute bottom-4 left-6">
           <span className="inline-block px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider mb-2">
             Demo App
           </span>
        </div>
      </div>

      <StTitle>Pro Trader Dashboard</StTitle>
      
      <StText>
        Real-time market analysis and portfolio performance tracking.
        Use the sidebar controls to filter assets and adjust risk parameters. 
        Built with <code className="bg-muted px-1 py-0.5 rounded font-mono text-sm">replit-design-engine</code> for professional traders.
      </StText>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
        <StMetric 
          label="Portfolio Value" 
          value={`$${(filteredData.reduce((a, b) => a + b.revenue, 0)).toLocaleString()}`} 
          delta="+12.5%" 
          deltaType="positive" 
        />
        <StMetric 
          label="Daily P&L" 
          value={`$${(filteredData.reduce((a, b) => a + b.profit, 0)).toLocaleString()}`} 
          delta="-2.4%" 
          deltaType="negative" 
        />
        <StMetric 
          label="Open Positions" 
          value="12" 
          delta="+2" 
          deltaType="positive" 
        />
      </div>

      {/* Main Charts */}
      <StHeader>Revenue Trends</StHeader>
      <StText>
        Monthly revenue breakdown for the selected region <strong>{selectedRegion}</strong>.
      </StText>
      
      <StLineChart 
        data={filteredData} 
        dataKey="month" 
        categories={showProfit ? ["revenue", "profit"] : ["revenue"]} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div>
          <StSubheader>Customer Growth</StSubheader>
          <StBarChart 
            data={filteredData.slice(0, 6)} 
            dataKey="month" 
            categories={["customers"]} 
          />
        </div>
        <div>
          <StSubheader>Regional Distribution</StSubheader>
          <StText>
            Distribution of sales across top performing product categories.
            The data suggests a strong preference for <strong>Neural Chip</strong> technology.
          </StText>
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
             <div className="space-y-3">
               <div className="flex justify-between text-sm">
                 <span>Neural Chips</span>
                 <span className="font-mono">45%</span>
               </div>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-chart-1 w-[45%]" />
               </div>
               
               <div className="flex justify-between text-sm">
                 <span>Quantum Cores</span>
                 <span className="font-mono">30%</span>
               </div>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-chart-2 w-[30%]" />
               </div>

               <div className="flex justify-between text-sm">
                 <span>Bio-Links</span>
                 <span className="font-mono">25%</span>
               </div>
               <div className="h-2 bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-chart-3 w-[25%]" />
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Dataframe Section */}
      <StHeader>Raw Data</StHeader>
      <StText>
        View the underlying data for the current selection. You can sort and filter this table in the full version.
      </StText>
      
      <StDataFrame 
        data={DATAFRAME_DATA} 
        columns={["asset", "signal", "sentiment", "volume"]} 
      />

      {/* Code Toggle Section */}
      {showCode && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <StHeader>Source Code</StHeader>
          <StCodeBlock>
{`import streamlit as st
import pandas as pd
import numpy as np

st.title('Sales Performance Dashboard')

# Sidebar controls
region = st.sidebar.selectbox(
    'Select Region',
    ('North America', 'Europe', 'Asia Pacific')
)

if st.checkbox('Show raw data'):
    st.subheader('Raw data')
    st.write(data)

st.line_chart(chart_data)`}
          </StCodeBlock>
        </div>
      )}
    </StreamlitLayout>
  );
}
