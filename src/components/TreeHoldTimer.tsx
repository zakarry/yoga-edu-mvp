import React from 'react';

// Instructions do not consume either side's hold. Keep the numeric timer visible.
export function TreeHoldTimer({ remaining, holdSeconds }: { remaining: number; holdSeconds: number }) {
  const preparing = remaining <= 0;
  const seconds = preparing ? holdSeconds : remaining;
  return <>
    <strong>{preparing ? '案内中' : '保持中'}</strong>
    <span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
  </>;
}
