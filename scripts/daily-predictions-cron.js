#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log file path
const logFile = path.join(__dirname, '..', 'logs', 'predictions-cron.log');

// Ensure logs directory exists
const logsDir = path.dirname(logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  console.log(logMessage.trim());

  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Check if market is open (weekdays 9:30 AM - 4:00 PM ET)
function isMarketOpen() {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));

  const dayOfWeek = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();

  // Market closed on weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;

  return marketOpen;
}

// Run the predictions generation
async function runPredictions() {
  log('Starting daily predictions cron job');

  try {
    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'FINNHUB_API_KEY', 'OPENAI_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      log(`Missing required environment variables: ${missingVars.join(', ')}`, 'ERROR');
      process.exit(1);
    }

    log('Environment variables check passed');

    // Check if market is open
    if (!isMarketOpen()) {
      log('Market is closed - skipping predictions generation');
      return;
    }

    log('Market is open - proceeding with predictions generation');

    // Run the populateOracle script
    const scriptPath = path.join(__dirname, 'populateOracle.ts');
    log(`Executing: npx tsx ${scriptPath}`);

    const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
      timeout: 300000 // 5 minutes timeout
    });

    if (stdout) {
      log(`Script output: ${stdout}`);
    }

    if (stderr) {
      log(`Script stderr: ${stderr}`, 'WARN');
    }

    log('Predictions generation completed successfully');

  } catch (error) {
    log(`Predictions generation failed: ${error.message}`, 'ERROR');
    log(`Stack trace: ${error.stack}`, 'ERROR');
    process.exit(1);
  }
}

// Main execution
async function main() {
  const startTime = new Date();
  log(`=== Daily Predictions Cron Started at ${startTime.toISOString()} ===`);

  try {
    await runPredictions();

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    log(`=== Daily Predictions Cron Completed in ${duration}ms ===`);

  } catch (error) {
    log(`=== Daily Predictions Cron Failed ===`, 'ERROR');
    process.exit(1);
  }
}

main();
