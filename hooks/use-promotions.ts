import { fetchPromotions, type Promotion } from '@/utils/promotions';
import { useEffect, useState } from 'react';

export function usePromotions(type: 5 | 10, refreshKey: number) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchPromotions(type).then(data => {
      if (active) setPromotions(data);
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [type, refreshKey, retryKey]);
  return { promotions, loading, error, retry: () => setRetryKey(key => key + 1) };
}
