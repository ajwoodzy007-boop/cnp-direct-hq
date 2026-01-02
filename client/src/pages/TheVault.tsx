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

        {/* High-Density List View */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticker</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Signal</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredData.map((prediction, idx) => {
                  const outcomeBadge = prediction.outcome === 'WIN'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : prediction.outcome === 'LOSS'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

                  const outcomeText = prediction.outcome === 'WIN'
                    ? 'ACHIEVED'
                    : prediction.outcome === 'LOSS'
                      ? 'MISSED'
                      : 'PENDING';

                  return (
                    <tr
                      key={`vault-${prediction.id}-${idx}`}
                      onClick={() => setSelectedPrediction(prediction)}
                      className="hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {prediction.displayDate}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">
                        {prediction.ticker}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">
                        {prediction.signal?.substring(0, 60)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          {prediction.confidenceScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${outcomeBadge}`}>
                          {prediction.outcome === 'WIN' && '🎯 '}
                          {prediction.outcome === 'LOSS' && '📉 '}
                          {outcomeText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="px-4 py-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-400">No predictions found for the selected filter.</p>
            </div>
          )}
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

                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Target Price</div>
                      <div className="text-lg font-bold text-green-400">${selectedPrediction.predictedPrice?.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Actual Close</div>
                      <div className="text-lg font-bold text-orange-400">
                        {selectedPrediction.outcome_price ? `$${selectedPrediction.outcome_price.toFixed(2)}` : 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Price Delta</div>
                      <div className={`text-lg font-bold ${
                        selectedPrediction.outcome_price && selectedPrediction.predictedPrice
                          ? (selectedPrediction.outcome_price >= selectedPrediction.predictedPrice ? 'text-green-400' : 'text-red-400')
                          : 'text-slate-400'
                      }`}>
                        {selectedPrediction.outcome_price && selectedPrediction.predictedPrice
                          ? `${selectedPrediction.outcome_price >= selectedPrediction.predictedPrice ? '+' : ''}${(selectedPrediction.outcome_price - selectedPrediction.predictedPrice).toFixed(2)}`
                          : 'N/A'
                        }
                      </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-1">Confidence</div>
                      <div className="text-lg font-bold text-cyan-400">{selectedPrediction.confidenceScore}%</div>
                    </div>
                  </div>

                  {/* Full AI Signal */}
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-2 font-semibold">Complete AI Signal</div>
                    <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">{selectedPrediction.signal}</div>
                  </div>

                  {/* Performance Analysis */}
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-2 font-semibold">Performance Analysis</div>
                    <div className={`text-sm ${
                      selectedPrediction.outcome === 'WIN'
                        ? 'text-green-400'
                        : selectedPrediction.outcome === 'LOSS'
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}>
                      {selectedPrediction.outcome === 'WIN' && selectedPrediction.outcome_price && selectedPrediction.predictedPrice && (
                        <div>
                          <strong>🎯 TARGET ACHIEVED:</strong> Price reached ${selectedPrediction.outcome_price.toFixed(2)}, exceeding the target of ${selectedPrediction.predictedPrice.toFixed(2)} by ${(selectedPrediction.outcome_price - selectedPrediction.predictedPrice).toFixed(2)}.
                        </div>
                      )}
                      {selectedPrediction.outcome === 'LOSS' && selectedPrediction.outcome_price && selectedPrediction.predictedPrice && (
                        <div>
                          <strong>📉 TARGET MISSED:</strong> Price closed at ${selectedPrediction.outcome_price.toFixed(2)}, falling short of the target of ${selectedPrediction.predictedPrice.toFixed(2)} by ${(selectedPrediction.predictedPrice - selectedPrediction.outcome_price).toFixed(2)}.
                        </div>
                      )}
                      {!selectedPrediction.outcome && (
                        <div>
                          <strong>⏳ EVALUATION PENDING:</strong> This prediction is still being evaluated.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Learning Metadata */}
                  {selectedPrediction.learning_metadata && (
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <div className="text-sm text-slate-400 mb-2 font-semibold">AI Learning & Strategy Notes</div>
                      <div className="text-cyan-400 text-sm space-y-2">
                        {selectedPrediction.learning_metadata.strategy_note && (
                          <div>
                            <strong>Strategy Applied:</strong> {selectedPrediction.learning_metadata.strategy_note}
                          </div>
                        )}
                        {selectedPrediction.learning_metadata.learning_note && (
                          <div>
                            <strong>AI Reflection:</strong> {selectedPrediction.learning_metadata.learning_note}
                          </div>
                        )}
                        {selectedPrediction.learning_metadata.momentum_indicators && (
                          <div>
                            <strong>Market Context:</strong> RSI {selectedPrediction.learning_metadata.momentum_indicators.rsi}, RVol {selectedPrediction.learning_metadata.momentum_indicators.rvol}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Audit Timestamps */}
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-sm text-slate-400 mb-2 font-semibold">Audit Trail</div>
                    <div className="text-slate-300 text-sm space-y-1 font-mono">
                      <div><strong>🧠 Generated At:</strong> {new Date(selectedPrediction.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short'
                      })}</div>
                      <div><strong>📦 Archived At:</strong> {new Date(selectedPrediction.moved_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZoneName: 'short'
                      })}</div>
                      <div><strong>🏷️ Record ID:</strong> {selectedPrediction.id}</div>
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
