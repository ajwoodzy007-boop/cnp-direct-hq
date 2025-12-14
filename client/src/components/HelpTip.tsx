import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function HelpTip({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1.5 align-middle z-50">
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="text-slate-600 hover:text-cyan-400 transition-colors focus:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl z-[70] animate-in zoom-in-95 duration-200">
            <p className="text-xs text-slate-200 text-left leading-relaxed">{content}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800"></div>
          </div>
        </>
      )}
    </span>
  );
}