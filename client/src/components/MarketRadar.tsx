// Inside MarketRadar.tsx
const fetchBriefing = async () => {
  // ⚡ HARD-WIRED DIRECT PATH
  const res = await fetch("http://localhost:5000/api/academy/briefing");
  return res.json();
};