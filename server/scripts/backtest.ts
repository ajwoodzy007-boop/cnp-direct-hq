import YahooFinanceDefault from 'yahoo-finance2';
// @ts-ignore - vader-sentiment doesn't have type declarations
import { SentimentIntensityAnalyzer } from 'vader-sentiment';
import { RSI } from 'technicalindicators';

const YahooFinance = (YahooFinanceDefault as any).default || YahooFinanceDefault;
const yf = typeof YahooFinance === 'function' ? new YahooFinance() : YahooFinance;

const getSentimentScore = (text: string): number => {
  const analyzer = SentimentIntensityAnalyzer;
  const result = analyzer.polarity_scores(text);
  return result.compound;
};

interface BacktestResult {
  date: string;
  ticker: string;
  signal: string;
  openPrice: number;
  closePrice: number;
  returnPercent: number;
  win: boolean;
}

interface DailySummary {
  date: string;
  picks: BacktestResult[];
  winCount: number;
  lossCount: number;
  avgReturn: number;
}

async function getHistoricalData(ticker: string, date: Date): Promise<{
  open: number;
  close: number;
  rsi: number;
  rvol: number;
  sentiment: number;
} | null> {
  try {
    const startDate = new Date(date);
    startDate.setMonth(startDate.getMonth() - 1);
    
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const chartData = await yf.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }) as any;
    
    const quotes = chartData?.quotes || [];
    if (quotes.length < 15) return null;
    
    const targetDateStr = date.toISOString().split('T')[0];
    const dayQuote = quotes.find((q: any) => {
      const qDate = new Date(q.date).toISOString().split('T')[0];
      return qDate === targetDateStr;
    });
    
    if (!dayQuote || !dayQuote.open || !dayQuote.close) return null;
    
    const closes = quotes.slice(0, -1).map((q: any) => q.close).filter((c: any) => c != null);
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const currentRSI = rsiValues[rsiValues.length - 1] || 50;
    
    const volumes = quotes.slice(0, -1).map((q: any) => q.volume).filter((v: any) => v != null);
    const avgVol = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
    const currentVol = dayQuote.volume || 0;
    const rvol = avgVol > 0 ? currentVol / avgVol : 1;
    
    let sentiment = 0;
    try {
      const news = await yf.search(ticker, { newsCount: 5 }) as any;
      if (news && news.news) {
        let total = 0;
        let count = 0;
        news.news.forEach((n: any) => {
          if (n.title) {
            total += getSentimentScore(n.title);
            count++;
          }
        });
        sentiment = count > 0 ? total / count : 0;
      }
    } catch (e) {
      sentiment = 0;
    }
    
    return {
      open: dayQuote.open,
      close: dayQuote.close,
      rsi: currentRSI,
      rvol,
      sentiment
    };
  } catch (error) {
    return null;
  }
}

async function getGainersForDate(date: Date): Promise<string[]> {
  const symbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'NFLX', 'CRM',
    'INTC', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SHOP', 'ROKU', 'ZM', 'SNOW', 'PLTR',
    'COIN', 'HOOD', 'SOFI', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'F', 'GM',
    'BA', 'DAL', 'UAL', 'AAL', 'LUV', 'CCL', 'RCL', 'NCLH', 'MAR', 'HLT',
    'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'WMT', 'TGT', 'COST', 'HD', 'LOW',
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'BLK', 'SCHW', 'USB', 'PNC',
    'XOM', 'CVX', 'COP', 'OXY', 'SLB', 'HAL', 'BP', 'SHEL', 'TTE', 'ENB',
    'PFE', 'JNJ', 'UNH', 'MRK', 'ABBV', 'LLY', 'BMY', 'AMGN', 'GILD', 'BIIB'
  ];
  
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  
  const gains: { ticker: string; gain: number }[] = [];
  
  for (const ticker of symbols) {
    try {
      const chart = await yf.chart(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      }) as any;
      
      const quotes = chart?.quotes || [];
      const targetDateStr = date.toISOString().split('T')[0];
      const dayQuote = quotes.find((q: any) => {
        const qDate = new Date(q.date).toISOString().split('T')[0];
        return qDate === targetDateStr;
      });
      
      if (dayQuote && dayQuote.open && dayQuote.close) {
        const gain = ((dayQuote.close - dayQuote.open) / dayQuote.open) * 100;
        gains.push({ ticker, gain });
      }
    } catch (e) {
      continue;
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  return gains
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 15)
    .map(g => g.ticker);
}

function getTradingDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

async function runBacktest(): Promise<void> {
  console.log('\n========================================');
  console.log('CNPdirect ALGORITHM BACKTEST');
  console.log('Testing: MOMENTUM BUY + VALUE BUY only');
  console.log('Filters: RSI 35-65, Sentiment >= 0.1, RVOL >= 1.5');
  console.log('========================================\n');
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  
  const tradingDays = getTradingDays(startDate, endDate);
  console.log(`Testing ${tradingDays.length} trading days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);
  
  const allResults: DailySummary[] = [];
  let totalWins = 0;
  let totalLosses = 0;
  let totalReturn = 0;
  let totalPicks = 0;
  
  for (const day of tradingDays) {
    const dateStr = day.toISOString().split('T')[0];
    console.log(`\n--- ${dateStr} ---`);
    
    const candidates = await getGainersForDate(day);
    console.log(`  Scanning ${candidates.length} candidates...`);
    
    const qualifiedPicks: BacktestResult[] = [];
    
    for (const ticker of candidates) {
      if (qualifiedPicks.length >= 5) break;
      
      const data = await getHistoricalData(ticker, day);
      if (!data) continue;
      
      let signal = '';
      
      if (data.rvol > 1.5 && data.sentiment > 0.1 && data.rsi >= 45 && data.rsi <= 65) {
        signal = 'MOMENTUM BUY';
      } else if (data.rsi < 35 && data.sentiment > 0.1) {
        signal = 'VALUE BUY';
      }
      
      if (signal) {
        const returnPercent = ((data.close - data.open) / data.open) * 100;
        const win = returnPercent > 0;
        
        qualifiedPicks.push({
          date: dateStr,
          ticker,
          signal,
          openPrice: data.open,
          closePrice: data.close,
          returnPercent,
          win
        });
        
        console.log(`  ${win ? '✓' : '✗'} ${ticker}: ${signal} | Open: $${data.open.toFixed(2)} → Close: $${data.close.toFixed(2)} | ${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%`);
      }
      
      await new Promise(r => setTimeout(r, 100));
    }
    
    if (qualifiedPicks.length === 0) {
      console.log(`  No picks qualified for ${dateStr}`);
      continue;
    }
    
    const dayWins = qualifiedPicks.filter(p => p.win).length;
    const dayLosses = qualifiedPicks.filter(p => !p.win).length;
    const dayAvgReturn = qualifiedPicks.reduce((sum, p) => sum + p.returnPercent, 0) / qualifiedPicks.length;
    
    allResults.push({
      date: dateStr,
      picks: qualifiedPicks,
      winCount: dayWins,
      lossCount: dayLosses,
      avgReturn: dayAvgReturn
    });
    
    totalWins += dayWins;
    totalLosses += dayLosses;
    totalReturn += qualifiedPicks.reduce((sum, p) => sum + p.returnPercent, 0);
    totalPicks += qualifiedPicks.length;
    
    console.log(`  Day Summary: ${dayWins}W / ${dayLosses}L | Avg: ${dayAvgReturn >= 0 ? '+' : ''}${dayAvgReturn.toFixed(2)}%`);
  }
  
  console.log('\n========================================');
  console.log('BACKTEST RESULTS SUMMARY');
  console.log('========================================');
  console.log(`Total Trading Days: ${allResults.length}`);
  console.log(`Total Picks: ${totalPicks}`);
  console.log(`Wins: ${totalWins} | Losses: ${totalLosses}`);
  console.log(`Win Rate: ${((totalWins / totalPicks) * 100).toFixed(1)}%`);
  console.log(`Average Return per Pick: ${(totalReturn / totalPicks).toFixed(2)}%`);
  console.log(`Total Cumulative Return: ${totalReturn.toFixed(2)}%`);
  
  const winningDays = allResults.filter(d => d.winCount > d.lossCount).length;
  const losingDays = allResults.filter(d => d.lossCount > d.winCount).length;
  console.log(`\nWinning Days: ${winningDays} | Losing Days: ${losingDays}`);
  console.log(`Day Win Rate: ${((winningDays / allResults.length) * 100).toFixed(1)}%`);
  console.log('========================================\n');
}

runBacktest().catch(console.error);
