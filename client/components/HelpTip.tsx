import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface HelpTipProps {
  content: string;
}

export default function HelpTip({ content }: HelpTipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-slate-500 hover:text-cyan-400 transition-colors p-0.5"
        aria-label="Help"
        data-testid="button-helptip"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-48 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 leading-relaxed">
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
          </div>
        </>
      )}
    </span>
  );
}
