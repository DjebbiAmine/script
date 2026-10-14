import { useEffect, useRef } from 'react';

// Subscribes to the server's Server-Sent Events stream (/script/wss). `onChange` runs every
// time an admin edit is saved, so screens can refetch. EventSource reconnects by itself.
export function useLiveUpdates(onChange: () => void): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const source = new EventSource('/script/wss');
    source.addEventListener('change', () => handler.current());
    return () => source.close();
  }, []);
}
