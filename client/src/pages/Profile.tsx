import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  KeyIcon,
  ChartBarIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon
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

interface UserStats {
  totalPredictionsViewed: number;
  favoriteTickers: string[];
  accountCreated: string;
  lastLogin: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Account Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(user?.email?.split('@')[0] || '');
  const [showPasswords, setShowPasswords] = useState(false);

  // Portfolio State
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newCost, setNewCost] = useState('');

  // Stats State
  const [userStats, setUserStats] = useState<UserStats>({
    totalPredictionsViewed: 0,
    favoriteTickers: [],
    accountCreated: user?.createdAt || '',
    lastLogin: new Date().toISOString()
  });

  const [loading, setLoading] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load portfolio
        const portfolioRes = await fetch('/api/user/portfolio');
        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolio(portfolioData.portfolio || []);
        }

        // Load stats
        const statsRes = await fetch('/api/user/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setUserStats(statsData.stats || userStats);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully changed.",
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast({
          title: "Password Change Failed",
          description: error.message || "Failed to update password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName
        })
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to update profile.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserIcon className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-slate-400">Manage your account settings and personal portfolio</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Settings */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <CogIcon className="h-5 w-5 text-cyan-400" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Update */}
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-slate-300">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <Label className="text-slate-300">Email Address</Label>
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-800 border-slate-600 text-slate-400 mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500"
              >
                Update Profile
              </Button>
            </form>

            {/* Password Change */}
            <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-slate-700 pt-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <KeyIcon className="h-4 w-4 text-orange-400" />
                Change Password
              </h3>

              <div>
                <Label htmlFor="currentPassword" className="text-slate-300">Current Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords ? (
                      <EyeSlashIcon className="h-4 w-4 text-slate-400" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword" className="text-slate-300">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  required
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-500"
              >
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Portfolio */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-green-400" />
              My Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Holding */}
            <form onSubmit={handleAddToPortfolio} className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Add Holding</h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="ticker" className="text-slate-300 text-xs">Ticker</Label>
                  <Input
                    id="ticker"
                    type="text"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                    className="bg-slate-800 border-slate-600 text-white mt-1 text-sm"
                    placeholder="AAPL"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="shares" className="text-slate-300 text-xs">Shares</Label>
                  <Input
                    id="shares"
                    type="number"
                    value={newShares}
                    onChange={(e) => setNewShares(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1 text-sm"
                    placeholder="100"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost" className="text-slate-300 text-xs">Avg Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white mt-1 text-sm"
                    placeholder="150.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add to Portfolio
              </Button>
            </form>

            {/* Portfolio Holdings */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Current Holdings</h3>

              {portfolio.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ChartBarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No holdings in your portfolio yet.</p>
                  <p className="text-sm">Add some stocks above to get started!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {portfolio.map((holding) => (
                    <div key={holding.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{holding.ticker}</div>
                        <div className="text-sm text-slate-400">
                          {holding.shares} shares @ ${holding.averageCost.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right mr-3">
                        <div className="text-sm text-slate-300">
                          Value: ${((holding.currentPrice || holding.averageCost) * holding.shares).toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          (holding.currentPrice || 0) >= holding.averageCost
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          P&L: ${(((holding.currentPrice || holding.averageCost) - holding.averageCost) * holding.shares).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveFromPortfolio(holding.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Platform Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-cyan-400">{userStats.totalPredictionsViewed}</div>
              <div className="text-sm text-slate-400">Predictions Viewed</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{userStats.favoriteTickers.length}</div>
              <div className="text-sm text-slate-400">Favorite Tickers</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {new Date(userStats.accountCreated).getFullYear()}
              </div>
              <div className="text-sm text-slate-400">Member Since</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {Math.floor((Date.now() - new Date(userStats.lastLogin).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-slate-400">Days Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
