import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const Chart = lazy(() => import('./weight-chart'));

export default function LazyWeightChart(props: { data: Array<{ date: string; weight: number; height: number; head: number }>; id: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} className="h-full w-full"><Suspense fallback={<p className="p-4 text-sm text-stone-400">正在准备体重曲线…</p>}>{visible && <Chart {...props} />}</Suspense></div>;
}
