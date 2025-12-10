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
- **Features**: Quotes, candlestick charts, company news, sentiment scores
- **Fallback**: Mock data when API key is not configured
- **Caching**: In-memory cache with 5-minute TTL to reduce API calls

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