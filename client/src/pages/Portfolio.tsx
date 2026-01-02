import React, { useState, useEffect } from 'react';
import {
  BriefcaseIcon,
  PlusIcon,
  TrashIcon,
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface PortfolioHolding {
  id: string;
  ticker: string;
  shares: number;
  averageCost: number;
  currentPrice?: number;
  addedAt: string;
}

export default function Portfolio() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newCost, setNewCost] = useState('');
  const [loading, setLoading] = useState(false);

  // Load portfolio data
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const portfolioRes = await fetch('/api/user/portfolio');
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolio(portfolioData.portfolio || []);
        }
      } catch (error) {
        console.error('Failed to load portfolio:', error);
      }
    };

    if (user) {
      loadPortfolio();
    }
  }, [user]);

  const handleAddToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();

    const shares = parseFloat(newShares);
    const cost = parseFloat(newCost);

    if (!newTicker.trim() || shares <= 0 || cost <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please provide valid ticker, shares, and cost.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/portfolio/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ticker: newTicker.toUpperCase(),
          shares,
          averageCost: cost
        })
      });

      if (response.ok) {
        const result = await response.json();
        setPortfolio([...portfolio, result.holding]);
        setNewTicker('');
        setNewShares('');
        setNewCost('');
        toast({
          title: "Added to Portfolio",
          description: `${newTicker.toUpperCase()} has been added to your portfolio.`,
        });
      } else {
        toast({
          title: "Add Failed",
          description: "Failed to add to portfolio.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to add to portfolio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromPortfolio = async (holdingId: string) => {
    try {
      const response = await fetch(`/api/user/portfolio/remove/${holdingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setPortfolio(portfolio.filter(h => h.id !== holdingId));
        toast({
          title: "Removed from Portfolio",
          description: "Holding has been removed from your portfolio.",
        });
      } else {
        toast({
          title: "Remove Failed",
          description: "Failed to remove from portfolio.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to remove from portfolio. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generatePlaybook = (ticker: string) => {
    toast({
      title: "AI Analysis Starting",
      description: `Generating investment playbook for ${ticker}...`,
    });
    // TODO: Implement AI playbook generation
  };

  const totalValue = portfolio.reduce((sum, holding) =>
    sum + ((holding.currentPrice || holding.averageCost) * holding.shares), 0
  );

  const totalCost = portfolio.reduce((sum, holding) =>
    sum + (holding.averageCost * holding.shares), 0
  );

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <BriefcaseIcon className="h-8 w-8 text-green-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
          <p className="text-slate-400">Manage your personal investment holdings with AI-powered insights</p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-slate-300">${totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400 mb-1">P&L</div>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnL.toFixed(2)}
            </div>
            <div className={`text-sm ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4">
            <div className="text-sm text-slate-400 mb-1">Holdings</div>
            <div className="text-2xl font-bold text-cyan-400">{portfolio.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Holding */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Add New Holding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddToPortfolio} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="ticker" className="text-slate-300">Ticker Symbol</Label>
              <Input
                id="ticker"
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="AAPL"
                required
              />
            </div>
            <div className="w-32">
              <Label htmlFor="shares" className="text-slate-300">Shares</Label>
              <Input
                id="shares"
                type="number"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="100"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div className="w-32">
              <Label htmlFor="cost" className="text-slate-300">Avg Cost</Label>
              <Input
                id="cost"
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="150.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Portfolio Holdings Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Shares</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Price</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Market Value</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">P&L</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Sentiment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {portfolio.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        <BriefcaseIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No holdings in your portfolio yet.</p>
                        <p className="text-sm">Add some stocks above to get started!</p>
                      </td>
                    </tr>
                  ) : (
                    portfolio.map((holding) => {
                      const marketValue = (holding.currentPrice || holding.averageCost) * holding.shares;
                      const costBasis = holding.averageCost * holding.shares;
                      const pnl = marketValue - costBasis;
                      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

                      return (
                        <tr key={holding.id} className="hover:bg-slate-800 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            {holding.ticker}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {holding.shares}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            ${holding.averageCost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="text-cyan-400 font-mono">
                              ${(holding.currentPrice || holding.averageCost).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="text-white font-mono">
                              ${marketValue.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${pnl.toFixed(2)}
                            </div>
                            <div className={`text-xs ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              ANALYZING
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                              onClick={() => generatePlaybook(holding.ticker)}
                            >
                              <CpuChipIcon className="h-4 w-4 mr-1" />
                              Playbook
                            </Button>
                            <Button
                              onClick={() => handleRemoveFromPortfolio(holding.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
