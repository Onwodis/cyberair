'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Infinite on-scroll reveal. Toggles the `.in-view` class every time the node
 * enters the viewport (and removes it when it leaves), so elements re-animate
 * as the user scrolls up and down — not just once.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
