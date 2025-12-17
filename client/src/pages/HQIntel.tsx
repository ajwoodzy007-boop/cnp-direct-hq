import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import HQIntelDashboard from '../components/HQIntelDashboard';

export default function HQIntel() {
  const [, setLocation] = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin/hq-intel/check')
      .then(res => res.json())
      .then(json => {
        if (json.hasAccess) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          setLocation('/');
        }
      })
      .catch(() => {
        setHasAccess(false);
        setLocation('/');
      });
  }, [setLocation]);

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 font-mono animate-pulse">Verifying Access...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <HQIntelDashboard onBack={() => setLocation('/')} />;
}
