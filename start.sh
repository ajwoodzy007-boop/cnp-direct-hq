#!/bin/bash
# Exit on any error
set -e

echo '🏛️ Starting Sentinel OS Background Tasks...'

# Run accuracy check and oracle population in the background
npm run check-accuracy &
npm run populate-oracle &

echo '⚡ Launching Main Server...'
# Run the main server in the foreground so the container stays alive
npm start
