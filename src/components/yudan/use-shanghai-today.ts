import { useEffect, useState } from 'react';
import { shanghaiToday } from '@/src/lib/health-records';

export function useShanghaiToday() {
  const [today, setToday] = useState(() => shanghaiToday());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setToday(shanghaiToday());
      clearTimeout(timer);
      const now = Date.now();
      const untilMidnight = 86400000 - ((now + 8 * 3600000) % 86400000);
      timer = setTimeout(refresh, untilMidnight + 50);
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return today;
}
