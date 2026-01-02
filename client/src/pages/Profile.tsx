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
  const [showPasswords, setShowPasswords] = useState(false);

  // Personal Information State
  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
    address: '',
    subscription_tier: 'free'
  });

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
        // Load profile
        const profileRes = await fetch('/api/user/profile');
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile || profile);
        }

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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast({
          title: "Profile Updated",
          description: "Your personal information has been successfully updated.",
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
          <p className="text-slate-400">Manage your personal information and investment portfolio</p>
        </div>
      </div>

      {/* Personal Information Form */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-cyan-400" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name" className="text-slate-300">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="phone_number" className="text-slate-300">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={profile.phone_number}
                  onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                  className="bg-slate-800 border-slate-600 text-white mt-1"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="text-slate-300">Address</Label>
              <Input
                id="address"
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Subscription Tier</Label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile.subscription_tier === 'premium'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                  }`}>
                    {profile.subscription_tier.toUpperCase()}
                  </span>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-500"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* My Live Portfolio - High Density Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-400" />
            My Live Portfolio
          </CardTitle>
          <p className="text-sm text-slate-400">Your personal holdings with AI-powered insights</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Holding Form */}
          <form onSubmit={handleAddToPortfolio} className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="ticker" className="text-slate-300 text-xs">Ticker Symbol</Label>
              <Input
                id="ticker"
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                className="bg-slate-800 border-slate-600 text-white mt-1"
                placeholder="TSLA"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add to Portfolio
            </Button>
          </form>

          {/* Portfolio Table */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Shares</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Price</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Sentiment</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {portfolio.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        <ChartBarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No holdings in your portfolio yet.</p>
                        <p className="text-sm">Add some stocks above to get started!</p>
                      </td>
                    </tr>
                  ) : (
                    portfolio.map((holding) => (
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            ANALYZING
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          >
                            Generate Playbook
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings - Password Change */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <KeyIcon className="h-5 w-5 text-orange-400" />
            Account Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-500"
            >
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
