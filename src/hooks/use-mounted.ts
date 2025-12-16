
'use client';

import { useState, useEffect } from 'react';

/**
 * A simple hook that returns `true` once the component has mounted on the client.
 * This is useful for deferring the rendering of components that are not SSR-compatible
 * or that cause hydration mismatches (e.g., due to random ID generation).
 *
 * @returns {boolean} `true` if the component is mounted, `false` otherwise.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
