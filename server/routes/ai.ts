import express from 'express';
import OpenAI from 'openai';
import { requirePremium } from '../middleware/premium';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Help Assistant - available to all users
const ASSISTANT_SYSTEM_PROMPT = `You are the CNPdirect AI Assistant, a helpful guide for the Sentinel OS trading platform. You help users understand the app, trading concepts, and troubleshoot issues.

About CNPdirect:
- CNPdirect is an AI-powered trading intelligence platform for retail traders
- "Sentinel OS" is the name of the AI engine that powers the platform

Main Features:
1. THE RADAR - Real-time market scanner showing top movers with RSI, RVOL (relative volume), and sentiment scores
2. THE ORACLE - Daily AI predictions (10 picks at 7:30 AM ET, finalized at 4:15 PM ET with real closing prices). Shows win/loss history and performance stats.
3. THE STRATEGIST - Premium AI playbooks including options signals, earnings analysis, pattern recognition
4. THE VAULT - Portfolio tracking and holdings management
5. THE ARCHIVES - Historical performance log showing past predictions

Key Trading Terms:
- RSI (Relative Strength Index): Momentum indicator. Above 70 = overbought, below 30 = oversold. Optimal buy range: 45-65
- RVOL (Relative Volume): Compares current volume to average. Above 2.0 = unusual activity
- Sentiment Score: AI analysis of news. Positive = bullish, negative = bearish
- MOMENTUM BUY: Strong upward trend signal
- VALUE BUY: Undervalued opportunity signal

Common Questions:
- Predictions are generated automatically at 7:30 AM ET each trading day
- Results are finalized at 4:15 PM ET with actual closing prices
- Premium features require a subscription (accessible via the lock icon)
- The Proof Log shows verified historical performance

Troubleshooting:
- "Data not loading" - Try refreshing the page or check your internet connection
- "Premium locked" - You need to subscribe to access that feature
- "No signals" - Market may be closed or no qualifying signals found

Keep responses concise, friendly, and helpful. Use simple language. If asked about something outside the app or trading, politely redirect to app-related topics.`;

router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Message required" });
  }

  try {
    const messages: any[] = [
      { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
      ...history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini", // Faster and cheaper for chat
      max_tokens: 500
    });

    const reply = completion.choices[0].message.content || "I'm sorry, I couldn't process that. Please try again.";

    res.json({ success: true, reply });

  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ success: false, error: "Assistant unavailable" });
  }
});

router.post('/analyze', requirePremium, async (req, res) => {
  const { ticker, rsi, trend, price } = req.body;

  try {
    const prompt = `
      You are 'Sentinel', an institutional trading AI. 
      Analyze ${ticker} based on this data:
      - Price: $${price}
      - RSI (14): ${rsi}
      - Trend: ${trend}
      
      Output a 'Tactical Report' in strict JSON format with these fields:
      1. "verdict": One of [STRONG BUY, BUY, HOLD, SELL, STRONG SELL].
      2. "summary": A 2-sentence professional analysis explaining the verdict based on the indicators.
      3. "risk": A short sentence on the downside risk.
      
      Do not use markdown. Just raw JSON.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    res.json({ success: true, data: aiResponse });

  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ success: false, error: "AI Brain Overload" });
  }
});

export default router;
