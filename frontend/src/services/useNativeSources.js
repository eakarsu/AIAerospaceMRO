import { useCallback, useEffect, useRef, useState } from 'react';
import { nativeRequest } from './nativeRequest';
import { readRecordList } from './nativeRecords';
export default function useNativeSources(url, token) {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const active = useRef(null);
  const load = useCallback(async () => {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setLoading(true); setError('');
    try {
      const response = await nativeRequest(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal });
      const records = readRecordList(await response.json());
      if (active.current === controller && !controller.signal.aborted) setRows(records);
    } catch (failure) { if (active.current === controller && !controller.signal.aborted) setError(failure.message || 'Saved sources could not be loaded.'); }
    finally { if (active.current === controller && !controller.signal.aborted) { active.current = null; setLoading(false); } }
  }, [url, token]);
  useEffect(() => { load(); return () => { active.current?.abort(); active.current = null; }; }, [load]);
  return { rows, loading, error, retry: load };
}
