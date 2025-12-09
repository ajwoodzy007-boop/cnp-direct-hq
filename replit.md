# Pro Trader Dashboard

## Overview

A real-time stock trading dashboard application that provides market scanning, technical analysis, sentiment analysis, and prediction tracking. The app displays market gainers/losers, interactive price charts, news sentiment, and allows users to record and track trading predictions.

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

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync

Current tables:
- `users` - User accounts with id, username, password
- `predictions` - Trading predictions with ticker, signal type, entry price, outcome tracking

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
- Radix UI primitives - Accessible component foundations