import React from 'react';

interface Props {
  className?: string;
}

export default function Skeleton({ className = "" }: Props) {
  return (
    <div className={`animate-pulse bg-slate-800 rounded ${className}`}></div>
  );
}
