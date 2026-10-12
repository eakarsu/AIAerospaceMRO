import { useCallback, useEffect, useRef, useState } from 'react';
import { nativeRequest } from './nativeRequest';
export default function useCancellableAIRequest() {
  const requests = useRef(new Set());
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const cancel = useCallback(() => { for (const controller of requests.current) controller.abort(); requests.current.clear(); if (mounted.current) setBusy(false); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; cancel(); }; }, [cancel]);
  const request = useCallback(async (url, options = {}) => {
    if (!/\/ai\//.test(String(url)) || String(options.method || 'GET').toUpperCase() !== 'POST') return nativeRequest(url, options);
    const controller = new AbortController(); requests.current.add(controller); setBusy(true);
    const done = () => { requests.current.delete(controller); if (mounted.current) setBusy(requests.current.size > 0); };
    const externalAbort = () => controller.abort(); options.signal?.addEventListener('abort', externalAbort, { once: true });
    try {
      const response = await nativeRequest(url, { ...options, signal: controller.signal });
      const read = response.json.bind(response);
      response.json = async () => { try { const body = await read(); if (controller.signal.aborted) throw new DOMException('Request cancelled.', 'AbortError'); return body; } finally { options.signal?.removeEventListener('abort', externalAbort); done(); } };
      return response;
    } catch (failure) { options.signal?.removeEventListener('abort', externalAbort); done(); throw failure; }
  }, []);
  return { request, cancel, busy };
}
