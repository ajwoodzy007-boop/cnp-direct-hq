#!/bin/bash
echo '🏛️ Starting Sentinel OS...'
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Start background tasks first
echo '📊 Starting background accuracy check...'
npm run check-accuracy &

echo '🤖 Starting background oracle population...'
npm run populate-oracle &

# Give background tasks a moment to start
sleep 2

# Start the main server (this keeps the container alive)
echo '🚀 Launching Main Server...'
npm start
