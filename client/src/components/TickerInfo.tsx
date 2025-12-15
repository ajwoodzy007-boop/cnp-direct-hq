import { useState } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CurrencyDollarIcon, BuildingOffice2Icon } from '@heroicons/react/24/solid';

interface TickerInfoProps {
  ticker: string;
  name?: string;
  isCrypto?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const CRYPTO_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'SOL': 'Solana',
  'LINK': 'Chainlink',
  'AVAX': 'Avalanche',
  'LTC': 'Litecoin',
  'DOGE': 'Dogecoin',
  'ADA': 'Cardano',
  'XRP': 'Ripple',
  'DOT': 'Polkadot',
  'MATIC': 'Polygon',
  'UNI': 'Uniswap',
  'ATOM': 'Cosmos',
  'NEAR': 'NEAR Protocol',
  'BNB': 'Binance Coin',
};

const STOCK_NAMES: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'NVDA': 'NVIDIA Corporation',
  'META': 'Meta Platforms Inc.',
  'TSLA': 'Tesla Inc.',
  'GME': 'GameStop Corp.',
  'AMC': 'AMC Entertainment',
  'RIVN': 'Rivian Automotive',
  'PLTR': 'Palantir Technologies',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel Corporation',
  'NFLX': 'Netflix Inc.',
  'DIS': 'Walt Disney Co.',
  'BA': 'Boeing Co.',
  'JPM': 'JPMorgan Chase',
  'V': 'Visa Inc.',
  'MA': 'Mastercard Inc.',
  'WMT': 'Walmart Inc.',
  'PG': 'Procter & Gamble',
  'JNJ': 'Johnson & Johnson',
  'UNH': 'UnitedHealth Group',
  'HD': 'Home Depot Inc.',
  'KO': 'Coca-Cola Co.',
  'PEP': 'PepsiCo Inc.',
  'MCD': 'McDonald\'s Corp.',
  'SBUX': 'Starbucks Corp.',
  'NKE': 'Nike Inc.',
  'LULU': 'Lululemon Athletica',
  'ANF': 'Abercrombie & Fitch',
  'AEO': 'American Eagle Outfitters',
  'ZIM': 'ZIM Integrated Shipping',
  'NOW': 'ServiceNow Inc.',
  'IT': 'Gartner Inc.',
  'CLSK': 'CleanSpark Inc.',
  'CIFR': 'Cipher Mining Inc.',
  'HUT': 'Hut 8 Mining Corp.',
  'APLD': 'Applied Digital Corp.',
  'IMNM': 'Immunome Inc.',
  'OLMA': 'Olema Pharmaceuticals',
  'SHAK': 'Shake Shack Inc.',
  'RH': 'RH (Restoration Hardware)',
  'CCC': 'Civeo Corporation',
  'YOU': 'Clear Secure Inc.',
  'KC': 'Kingsoft Cloud',
  'SBSW': 'Sibanye Stillwater',
  'RGC': 'Regencell Bioscience',
  'RYTM': 'Rhythm Pharmaceuticals',
  'PL': 'Planet Labs',
  'ENVA': 'Enova International',
  'ONDS': 'Ondas Holdings',
  'SEI': 'Sei Network',
};

function getFullName(ticker: string, isCrypto: boolean, providedName?: string): string {
  if (providedName) return providedName;
  const cleanTicker = ticker.replace('-USD', '').toUpperCase();
  if (isCrypto) {
    return CRYPTO_NAMES[cleanTicker] || `${cleanTicker} Cryptocurrency`;
  }
  return STOCK_NAMES[cleanTicker] || `${cleanTicker} Stock`;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
};

export default function TickerInfo({ ticker, name, isCrypto = false, className = '', size = 'md' }: TickerInfoProps) {
  const [showModal, setShowModal] = useState(false);
  const fullName = getFullName(ticker, isCrypto, name);
  const cleanTicker = ticker.replace('-USD', '').toUpperCase();

  return (
    <>
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className={`font-bold text-white ${sizeClasses[size]}`}>{cleanTicker}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="text-slate-500 hover:text-cyan-400 transition-colors"
          data-testid={`info-btn-${cleanTicker}`}
        >
          <InformationCircleIcon className={iconSizes[size]} />
        </button>
      </span>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCrypto ? 'bg-orange-500/20' : 'bg-cyan-500/20'}`}>
                  {isCrypto ? (
                    <CurrencyDollarIcon className="h-6 w-6 text-orange-400" />
                  ) : (
                    <BuildingOffice2Icon className="h-6 w-6 text-cyan-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{cleanTicker}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${isCrypto ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {isCrypto ? 'Cryptocurrency' : 'Stock'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Full Name</div>
                <div className="text-white font-medium">{fullName}</div>
              </div>
              
              <div>
                <div className="text-xs text-slate-500 uppercase mb-1">Symbol</div>
                <div className="text-slate-300 font-mono">{isCrypto ? `$${cleanTicker}` : cleanTicker}</div>
              </div>

              {isCrypto && (
                <div>
                  <div className="text-xs text-slate-500 uppercase mb-1">Trading</div>
                  <div className="text-slate-300">24/7 Markets</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className={`w-full mt-6 py-2 rounded-lg font-medium transition-colors ${isCrypto ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
