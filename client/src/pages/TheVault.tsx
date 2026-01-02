import React, { useState, useEffect } from 'react';
import { ViewfinderCircleIcon, ArrowLeftIcon, ClockIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import TickerInfo from '@/components/TickerInfo';

interface VaultPrediction {
  id: number;
  ticker: string;
  predictedPrice: number;
  confidenceScore: number;
  signal: string;
  entryPrice: number;
  outcome: string;
  outcome_price?: number;
  learning_metadata?: any;
  created_at: string;
  displayDate: string;
  moved_at: string;
  isArchived: boolean;
}

export default function TheVault() {
  const [, setLocation] = useLocation();
  const [vaultData, setVaultData] = useState<VaultPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<VaultPrediction | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'wins' | 'losses'>('all');

  useEffect(() => {
    const fetchVaultData = async () => {
      try {
        const res = await fetch('/api/oracle/vault');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setVaultData(json.data);
        } else {
          console.warn('Vault API returned invalid data:', json);
          setVaultData([]);
        }
      } catch (e) {
        console.error("Vault fetch error", e);
        setVaultData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVaultData();
  }, []);

  const filteredData = vaultData.filter(pred => {
    switch (activeTab) {
      case 'wins': return pred.outcome === 'WIN';
      case 'losses': return pred.outcome === 'LOSS';
      default: return true;
    }
  });

  const winRate = vaultData.length > 0
    ? Math.round((vaultData.filter(p => p.outcome === 'WIN').length / vaultData.length) * 100)
    : 0;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ArchiveBoxIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading vault records...</p>
          </div>
        </div>
      );
    }

    if (vaultData.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ArchiveBoxIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-400">No historical predictions in vault yet.</p>
            <p className="text-slate-500 text-sm">Predictions will appear here after being graded and archived.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Vault Header */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ArchiveBoxIcon className="h-8 w-8 text-orange-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">The Vault</h2>
                <p className="text-slate-400 text-sm">Historical Proof Logs & Learning Archive</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-400">{winRate}%</div>
              <div className="text-xs text-slate-400">Historical Win Rate</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm ${
                activeTab === 'all' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              All ({vaultData.length})
            </button>
            <button
              onClick={() => setActiveTab('wins')}
              className={`px-4 py-2 rounded-lg text-sm ${
                activeTab === 'wins' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Wins ({vaultData.filter(p => p.outcome === 'WIN').length})
            </button>
            <button
              onClick={() => setActiveTab('losses')}
              className={`px-4 py-2 rounded-lg text-sm ${
                activeTab === 'losses' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Losses ({vaultData.filter(p => p.outcome === 'LOSS').length})
            </button>
          </div>
        </div>

        {/* Prediction Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((prediction, idx) => {
            const cardStyles = prediction.outcome === 'WIN'
              ? 'bg-slate-900 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
              : prediction.outcome === 'LOSS'
                ? 'bg-slate-900 border border-slate-700'
                : 'bg-slate-900 border border-slate-800';

            const badgeStyles = prediction.outcome === 'WIN'
              ? 'bg-green-500 text-white border-green-600'
              : prediction.outcome === 'LOSS'
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

            const badgeText = prediction.outcome === 'WIN'
              ? '🎯 TARGET ACHIEVED'
              : prediction.outcome === 'LOSS'
                ? '📉 TARGET MISSED'
                : '❓ UNGRADED';

            return (
              <div key={`vault-${prediction.id}-${idx}`} className={`${cardStyles} p-6 rounded-xl relative overflow-hidden`}>
                {/* Outcome-specific background effect */}
                {prediction.outcome === 'WIN' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                )}

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold border ${badgeStyles} flex items-center gap-1`}>
                    {badgeText}
                  </span>
                </div>

                <div className="flex justify-between items-start mb-4 pt-12">
                  <TickerInfo ticker={prediction.ticker} isCrypto={false} />
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-cyan-500">{prediction.confidenceScore}% Conf.</span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <ClockIcon className="h-3 w-3" />
                      {prediction.displayDate}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Signal:</span>
                    <span className="text-white font-bold text-xs">
                      {prediction.signal.substring(0, 30)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Target:</span>
                    <span className="text-green-400 font-mono">${prediction.predictedPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                  {prediction.outcome_price && (
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span className="text-orange-400 font-mono">${prediction.outcome_price?.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedPrediction(prediction)}
                  className={`w-full mt-4 py-2 rounded-lg text-white text-xs transition-all ${
                    prediction.outcome === 'WIN'
                      ? 'bg-green-600 hover:bg-green-500'
                      : prediction.outcome === 'LOSS'
                        ? 'bg-red-600 hover:bg-red-500'
                        : 'bg-slate-800 hover:bg-cyan-700'
                  }`}
                >
                  {prediction.outcome === 'WIN' ? '🎯 View Success Analysis' :
                   prediction.outcome === 'LOSS' ? '📊 Review Failure Analysis' :
                   '🔍 View Analysis'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Detail Modal */}
        {selectedPrediction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArchiveBoxIcon className="h-6 w-6 text-orange-400" />
                    Vault Analysis: {selectedPrediction.ticker}
                  </h3>
                  <button
                    onClick={() => setSelectedPrediction(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Target Price</div>
                      <div className="text-lg font-bold text-green-400">${selectedPrediction.predictedPrice?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Confidence</div>
                      <div className="text-lg font-bold text-cyan-400">{selectedPrediction.confidenceScore}%</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Outcome</div>
                      <div className={`text-lg font-bold ${selectedPrediction.outcome === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedPrediction.outcome === 'WIN' ? '🎯 ACHIEVED' : selectedPrediction.outcome === 'LOSS' ? '📉 MISSED' : '❓ UNKNOWN'}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Actual Price</div>
                      <div className="text-lg font-bold text-orange-400">
                        {selectedPrediction.outcome_price ? `$${selectedPrediction.outcome_price.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-2">AI Signal</div>
                    <div className="text-white text-sm leading-relaxed">{selectedPrediction.signal}</div>
                  </div>

                  {selectedPrediction.learning_metadata && (
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-2">AI Learning Notes</div>
                      <div className="text-cyan-400 text-sm space-y-2">
                        {selectedPrediction.learning_metadata.strategy_note && (
                          <div><strong>Strategy:</strong> {selectedPrediction.learning_metadata.strategy_note}</div>
                        )}
                        {selectedPrediction.learning_metadata.bias_adjustments && (
                          <div><strong>Bias Adjustments:</strong> {JSON.stringify(selectedPrediction.learning_metadata.bias_adjustments, null, 2)}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-2">Timestamps</div>
                    <div className="text-slate-300 text-sm space-y-1">
                      <div><strong>Generated:</strong> {new Date(selectedPrediction.created_at).toLocaleString()}</div>
                      <div><strong>Archived:</strong> {new Date(selectedPrediction.moved_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
}
