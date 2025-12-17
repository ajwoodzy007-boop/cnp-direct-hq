# CNPdirect

## Overview

CNPdirect is a real-time stock trading dashboard application that provides market scanning, technical analysis, sentiment analysis, and prediction tracking. The app displays market gainers/losers, interactive price charts, news sentiment, and allows users to record and track trading predictions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Charts**: Recharts for interactive financial charts
- **Animations**: Framer Motion for layout animations

The frontend follows a component-based architecture with:
- Custom Streamlit-inspired layout components for dashboard structure
- Reusable UI primitives in `client/src/components/ui/`
- Feature-specific components in `client/src/components/streamlit/`

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON APIs under `/api/` prefix
- **Build System**: Vite for development, esbuild for production bundling

Key API endpoints:
- `GET /api/market/scan` - Fetch market gainers/losers with technical indicators
- `GET /api/market/chart/:ticker` - Get OHLCV chart data for a symbol
- `GET /api/market/news/:ticker` - Fetch news with sentiment analysis
- `POST /api/predictions` - Record trading predictions
- `GET /api/predictions` - Retrieve prediction history

**AI Playbook Premium Endpoints** (requires premium subscription):
- `POST /api/ai/playbook/strategies` - Generate personalized trading strategies
- `POST /api/ai/playbook/briefing` - Generate daily market briefing
- `POST /api/ai/playbook/signals` - Generate smart entry/exit signals
- `POST /api/ai/playbook/risk` - Generate risk assessment for a stock
- `POST /api/ai/playbook/portfolio` - Generate portfolio optimization
- `POST /api/ai/playbook/patterns` - Generate pattern recognition analysis
- `POST /api/ai/playbook/earnings` - Generate earnings play analysis
- `POST /api/ai/playbook/options` - Generate options trading signals
- `POST /api/strategist/quick-analyze` - Comprehensive AI analysis for any ticker
- `GET /api/user/premium-status` - Check user's premium subscription status

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync

Current tables:
- `users` - User accounts with id, username, password
- `predictions` - Trading predictions with ticker, signal type, entry price, outcome tracking
- `user_profiles` - User preferences, trading style, risk tolerance, subscription status
- `user_portfolio` - User's stock holdings for portfolio optimization
- `ai_playbook_runs` - Tracks AI playbook generation sessions
- `playbook_sections` - Stores generated AI content for each feature
- `cached_market_metrics` - Cached market data for efficiency
- `daily_prediction_runs` - Daily Top 10 prediction tracking
- `daily_prediction_entries` - Individual predictions with win/loss outcomes

### Market Data Integration
- **Primary API**: Finnhub API for real-time stock data
- **Secondary API**: Yahoo Finance (yahoo-finance2) for crypto data and charts
- **Features**: Quotes, candlestick charts, company news, sentiment scores
- **Fallback**: Mock data when API key is not configured
- **Caching**: In-memory cache with 5-minute TTL to reduce API calls

### Cryptocurrency Scanner
The Radar includes a dedicated Crypto tab analyzing 15 major cryptocurrencies:
- **Supported Assets**: BTC, ETH, SOL, LINK, AVAX, LTC, DOGE, ADA, XRP, DOT, MATIC, UNI, ATOM, NEAR, BNB
- **Technical Indicators**: RSI (14-period), Relative Volume (RVOL)
- **Data Source**: Yahoo Finance via yahoo-finance2 package
- **Signal Logic**: Uses adjusted thresholds for crypto volatility (RSI < 35 for BUY)
- **Implementation**: `server/lib/cryptoScanner.ts` mirrors sentinel.ts patterns
- **API Endpoint**: `GET /api/market/crypto` - Returns sorted crypto signals
- **UI**: Tabbed interface in MarketRadar.tsx with orange theme for crypto assets

## External Dependencies

### APIs and Services
- **Finnhub API**: Stock market data, quotes, charts, and news (requires `FINNHUB_API_KEY` environment variable)

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Type-safe database queries and schema management

### Key NPM Packages
- `@tanstack/react-query` - Data fetching and caching
- `drizzle-orm` / `drizzle-zod` - Database ORM with Zod validation
- `express` - HTTP server framework
- `recharts` - Chart visualizations
- `framer-motion` - UI animations
- `wouter` - Client-side routing
- `openai` - AI content generation
- `stripe` - Payment processing for premium subscriptions
- Radix UI primitives - Accessible component foundations

## AI Playbook Premium Features

The AI Playbook is a premium feature offering 8 AI-powered trading tools:

1. **Trading Strategies** - Personalized playbooks based on trading style, risk tolerance, and experience
2. **Market Briefings** - Daily AI-generated market reports with sector analysis
3. **Smart Entry/Exit Signals** - AI identifies optimal entry/exit points with price levels
4. **Risk Assessment** - AI evaluates stocks with risk/reward scores and position sizing
5. **Portfolio Optimizer** - AI suggests portfolio adjustments for better diversification
6. **Pattern Recognition** - AI detects chart patterns with explanations and trade setups
7. **Earnings Analyzer** - AI analyzes earnings with pre/post strategies and options plays
8. **Options Signals** - AI generates call/put recommendations with strike prices, Greeks analysis, and risk management

**Architecture:**
- `server/lib/aiPlaybook.ts` - AI generation service using OpenAI GPT-4o
- Premium access controlled via `checkPremiumAccess()` middleware
- Results stored in `ai_playbook_runs` and `playbook_sections` tables
- Demo mode (`userId=demo`) allowed for testing (disable in production with `ALLOW_DEMO_MODE=false`)

**Security Notes:**
- Set `ALLOW_DEMO_MODE=false` in production to enforce premium authentication
- Full authentication (session/JWT) should be implemented before production deployment
- Premium status is checked via `storage.checkPremiumStatus(userId)` which validates subscription status

## Predictions Tab Enhancements

The Predictions tab (Top 10 Daily Picks) includes enhanced UI features:

### Visual Enhancements
- **Progress Bars**: Shows progress toward predicted price target with color-coded status
- **Confidence Gauges**: Color-coded progress bars showing AI confidence (green: 70%+, yellow: 50-70%, red: <50%)
- **Risk Level Badges**: Visual badges for Low/Medium/High risk (🛡️/⚖️/🔥 icons)
- **AI Reasoning Tooltips**: Popover with "Why this pick?" showing AI reasoning
- **Stop-Loss Indicators**: Displays calculated stop-loss prices for each prediction
- **Risk/Reward Ratios**: Shows R:R ratio for each pick
- **Locked Timestamps**: Shows when predictions were generated

### Sorting & Filtering
- **Sort by**: Rank (default), Confidence, Potential Return, or Risk Level
- Sorted predictions preserve original AI rank in tooltip

### Historical Accuracy Section
- **Win Streak Counter**: Shows consecutive winning days (days where wins > losses)
- **Fire Badge**: Displays special badge for streaks of 3+ days

### Technical Implementation
- `sortedPredictions` useMemo for efficient sorting based on user selection
- Win streak calculated from resolved entries only (ignoring pending)
- Risk metrics (stopLoss, riskLevel, riskRewardRatio, volatility) have default fallbacks
- TypeScript interfaces updated: `Top10Pick` includes risk fields, `PredictionStats` includes winStreak

## The Oracle - Crypto Predictions

The Oracle now includes separate tabs for Stock and Crypto predictions with full data isolation:

### Crypto Oracle Endpoints
- `GET /api/oracle/crypto-daily` - Generate/retrieve daily crypto predictions (10 picks)
- `POST /api/oracle/crypto-finalize` - Finalize crypto predictions with closing prices
- `GET /api/oracle/crypto-history` - Retrieve crypto prediction history with stats

### Data Separation
- **predictions table** now includes `assetType` field ('stock' or 'crypto')
- All stock endpoints filter by `assetType='stock'` (or NULL for legacy)
- All crypto endpoints filter by `assetType='crypto'`
- Complete separation ensures no data leakage between asset classes

### Scheduler Timing
- **Stocks**: Generate at 9:00 AM ET (30 min before market open for best pre-market data), update open prices at 9:35 AM ET, finalize at 4:15 PM ET
- **Crypto**: Generate at 8:00 AM ET, finalize at 11:59 PM ET (24/7 markets)

### UI Theming
- Stocks tab uses cyan accent color (`bg-cyan-600`, `text-cyan-500`)
- Crypto tab uses orange accent color (`bg-orange-600`, `text-orange-500`)
- Visual distinction helps users quickly identify asset type

## Unified Prediction System (December 2025)

The Oracle now uses a **unified prediction system** with single source of truth:

### Architecture
- **Single Database**: All predictions stored in `predictions` table (no more separate `daily_prediction_entries`)
- **Unified Endpoint**: `GET /api/oracle/daily` handles generation and retrieval
- **Force Refresh**: Use `?refresh=true` query param to regenerate picks

### Scoring Algorithm
The unified system scores ALL scanned stocks using multiple factors:
1. **Signal Type** (50 pts momentum, 40 pts value, 20 pts wait, -10 pts sell warning)
2. **RSI Range** (25 pts for 35-65 optimal zone, bonus for 45-55 sweet spot)
3. **Sentiment** (up to 40 pts for bullish news)
4. **Volume** (up to 30 pts for high RVOL)
5. **Price Change** (up to 30 pts for positive momentum)

Top 10 unique picks are selected by highest score.

### Historical Price Accuracy
- `getHistoricalOpenPrice()` uses 5-minute intraday data for recent dates when daily data unavailable
- Open prices updated at 9:35 AM ET with actual market open prices
- `/api/oracle/fix-all-historical-prices` endpoint corrects historical data

### Open Price Synchronization (December 2025)
The system ensures accurate 9:30 AM ET open prices with full metadata:

**Database Fields**:
- `openPriceLockedAt` - Timestamp when open price was locked
- `openPriceSource` - Source of price: 'regularMarketOpen', 'prevClose', or 'stale'
- `prevClose` - Previous day's closing price for fallback reference

**Fallback Chain**:
1. Primary: Yahoo Finance `regularMarketOpen` (actual auction price)
2. Fallback: Previous day's close (`prevClose`) with yellow warning label
3. Stale: No price data available, red warning displayed

**UI Indicators**:
- Normal: White price text, no label
- Prev Close Fallback: Yellow "(PREV CLOSE)" label, yellow price text
- Stale Data: Red "(STALE)" label, red price text
- Timestamp shown in popover: "Locked at 9:35 AM ET"

### Scheduler Flow
1. **9:00 AM ET**: Generate 10 picks via `/api/oracle/daily?refresh=true`
2. **9:35 AM ET**: Update with actual 9:30 AM open prices
3. **4:15 PM ET**: Finalize with closing prices and win/loss outcomes

## Learning Engine (December 2025)

The Oracle now learns from historical performance to improve future picks:

### How It Works
- Analyzes last 30 days of predictions with resolved outcomes (win/loss)
- Calculates win rates by signal type, RSI range, sector, confidence level
- Creates **learning multipliers** that boost or penalize scores based on historical performance

### Learning Factors
- **Signal Multipliers**: Signals that win more often get boosted (e.g., MOMENTUM BUY 1.08x)
- **RSI Range Multipliers**: RSI zones with better outcomes get preferred
- **Sector Multipliers**: Hot sectors get a boost, underperforming sectors get penalized
- **Confidence Multipliers**: Adjust based on how well confidence levels correlate with wins
- **Volume/Sentiment Multipliers**: Adjust based on whether high volume or bullish sentiment predicts wins

### Technical Details
- **Location**: `server/lib/learningEngine.ts`
- **Endpoint**: `GET /api/oracle/learning` - View current learning stats and insights
- **Cache**: Learning factors cached for 1 hour to reduce database queries
- **Minimum Sample**: Requires 20+ resolved predictions before applying learning

### Predictions Table Schema
Now stores learning-relevant data for each prediction:
- `rsi` - RSI value at time of pick
- `rvol` - Relative volume at time of pick
- `sector` - Stock sector for sector analysis
- `confidence` - Confidence level (High/Med/Low)
- `reasoning` - Human-readable reason for the pick