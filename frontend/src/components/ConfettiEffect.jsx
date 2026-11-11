import confetti from 'canvas-confetti';

export function fireApprovalConfetti(originElement) {
  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let origin = { x: 0.5, y: 0.6 };
  if (originElement && originElement.getBoundingClientRect) {
    const rect = originElement.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  // Cyan & Violet neon burst
  confetti({
    particleCount: 45,
    spread: 60,
    startVelocity: 28,
    origin: origin,
    colors: ['#06b6d4', '#22d3ee', '#8b5cf6', '#a855f7', '#10b981'],
    ticks: 180,
    gravity: 1.1,
    scalar: 0.85,
    shapes: ['circle', 'square'],
    disableForReducedMotion: true,
  });
}

export function fireRejectFeedback(originElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let origin = { x: 0.5, y: 0.6 };
  if (originElement && originElement.getBoundingClientRect) {
    const rect = originElement.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  confetti({
    particleCount: 20,
    spread: 40,
    startVelocity: 16,
    origin: origin,
    colors: ['#f43f5e', '#fb7185', '#64748b'],
    ticks: 120,
    gravity: 1.4,
    scalar: 0.7,
    disableForReducedMotion: true,
  });
}

