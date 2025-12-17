# CNPdirect

## Overview

CNPdirect is a real-time stock trading dashboard application offering market scanning, technical analysis, sentiment analysis, and prediction tracking. It displays market movers, interactive price charts, news sentiment, and allows users to record and track trading predictions. The platform aims to provide comprehensive tools for informed trading decisions, including premium AI-powered features for advanced strategy generation and market analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui on Radix UI, styled with Tailwind CSS v4
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Design**: Component-based, with custom Streamlit-inspired layouts and reusable UI primitives. Theming uses CSS variables.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful JSON APIs under `/api/`
- **Build System**: Vite (dev), esbuild (prod)
- **AI Playbook Endpoints**: Premium endpoints for generating trading strategies, market briefings, entry/exit signals, risk assessments, portfolio optimization, pattern recognition, earnings analysis, and options signals using AI.
- **Oracle Prediction System**: Unified system for daily stock and crypto predictions, incorporating a learning engine based on historical performance to refine future picks. It includes sophisticated open price synchronization and historical accuracy tracking.
- **HQ Intel Dashboard**: Admin-only dashboard for business intelligence, tracking KPIs like MRR, user count, churn, LTV, engagement (DAU/WAU/MAU), and marketing sources.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts`, managed with Drizzle Kit.
- **Key Tables**: `users`, `predictions` (unified for stocks/crypto with `assetType`), `user_profiles`, `user_portfolio`, `ai_playbook_runs`, `playbook_sections`, `cached_market_metrics`, `login_events`, `signal_engagement_events`.

### Market Data Integration
- **Primary API**: Finnhub API for real-time stock data.
- **Secondary API**: Yahoo Finance (yahoo-finance2) for crypto data and charts.
- **Features**: Quotes, candlestick charts, company news, sentiment scores.
- **Caching**: In-memory cache with 5-minute TTL.
- **Cryptocurrency Scanner**: Dedicated "Radar" tab for 15 major cryptocurrencies with technical indicators (RSI, RVOL) and specific signal logic.

### AI Playbook Premium Features
- Provides 8 AI-powered trading tools, including personalized strategies, market briefings, smart signals, risk assessment, portfolio optimization, pattern recognition, earnings analysis, and options signals.
- Implemented with an AI generation service (`server/lib/aiPlaybook.ts`) using OpenAI GPT-4o.
- Access controlled by premium subscription status.

### Oracle Prediction System
- **Unified Prediction**: Single `predictions` table for both stock and crypto, with `assetType` separation.
- **Scoring Algorithm**: Scores all scanned stocks based on signal type, RSI, sentiment, volume, and price change to select top 10 picks.
- **Open Price Synchronization**: Ensures accurate 9:30 AM ET open prices using a fallback chain (Yahoo Finance, previous close) with UI indicators for data source.
- **Learning Engine**: Analyzes past 30 days of predictions to create learning multipliers for signal types, RSI ranges, sectors, confidence, volume, and sentiment, continuously improving prediction accuracy.

### HQ Intel Dashboard
- Admin-only business intelligence dashboard at `/admin/hq-intel`.
- Displays KPIs (MRR, Total Operatives, Churn Rate, Avg LTV), Onboarding Intel (experience levels, marketing sources), and Retention & Engagement metrics (DAU, WAU, MAU, Signal Engagement).
- Features a distinct gold/amber theme.

## External Dependencies

### APIs and Services
- **Finnhub API**: Stock market data, quotes, charts, and news (requires `FINNHUB_API_KEY`).
- **Yahoo Finance**: Crypto data and charts.
- **OpenAI**: AI content generation (for AI Playbook features).
- **Stripe**: Payment processing for premium subscriptions.

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL`).
- **Drizzle ORM**: Type-safe database queries and schema management.

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching.
- `drizzle-orm` / `drizzle-zod`: Database ORM with Zod validation.
- `express`: HTTP server framework.
- `recharts`: Chart visualizations.
- `framer-motion`: UI animations.
- `wouter`: Client-side routing.
- `@openai/api`: OpenAI API client.
- `@stripe/stripe-js`: Stripe payment integration.
- `radix-ui`: Accessible component foundations.