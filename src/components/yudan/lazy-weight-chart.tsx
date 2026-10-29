import { lazy, Suspense, useEffect, useRef, useState } from 'react';
const Chart = lazy(() => import('./weight-chart'));

export default function LazyWeightChart(props: { data: Array<{ date: string; weight: number; height: number; head: number }>; birthday: string; id: string }) {
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
  const fallback = <p className="flex min-h-72 items-center justify-center p-4 text-sm text-muted-foreground" role="status">正在准备体重曲线…</p>;
  return <div ref={host} className="w-full min-w-0"><Suspense fallback={fallback}>{visible ? <Chart {...props} /> : fallback}</Suspense></div>;
}
