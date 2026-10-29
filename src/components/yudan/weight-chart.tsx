import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { getMaleWeightReferences } from '@/src/lib/growth-standards';

type WeightChartProps = {
  data: Array<{ date: string; weight: number; height: number; head: number }>;
  birthday: string;
  id: string;
};
type Standard = 'WHO' | 'CN';
type ChartMode = 'both' | Standard | 'measured';
type ReferenceSample = { day: number; values: ReturnType<typeof getMaleWeightReferences> };
type Percentile = 'p3' | 'p50' | 'p97';
const DAY_MS = 86_400_000;
const standards = {
  WHO: { name: 'WHO', color: '#587f9a', dash: undefined, lastDay: 731 },
  CN: { name: '中国 WS/T', color: '#af7b3e', dash: '7 4', lastDay: 2465 },
};
const modes: Array<{ value: ChartMode; label: string }> = [
  { value: 'both', label: '双标准' }, { value: 'WHO', label: 'WHO' },
  { value: 'CN', label: '中国 WS/T' }, { value: 'measured', label: '仅实测' },
];

function dateDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? Math.floor(time / DAY_MS) : null;
}
function dayDate(day: number) { return new Date(day * DAY_MS).toISOString().slice(0, 10); }

function referenceSamples(birthday: string, start: number, end: number): ReferenceSample[] {
  const dates = new Set([start, end]);
  const step = Math.max(1, Math.ceil((end - start) / 365));
  for (let day = start; day <= end; day += step) dates.add(day);
  const birth = dateDay(birthday);
  // Include the exact reference endpoints when a long chart is sampled less often
  // than daily. The helper remains authoritative about whether each date is valid.
  if (birth !== null) {
    for (const day of [birth, birth + standards.WHO.lastDay, birth + standards.CN.lastDay]) {
      if (day >= start && day <= end) dates.add(day);
    }
  }
  return [...dates].sort((a, b) => a - b).map((day) => ({ day, values: getMaleWeightReferences(birthday, dayDate(day)) }));
}

function referenceSegments(samples: ReferenceSample[], standard: Standard) {
  const segments: ReferenceSample[][] = [];
  let current: ReferenceSample[] = [];
  for (const sample of samples) {
    if (sample.values[standard]) current.push(sample);
    else if (current.length) { segments.push(current); current = []; }
  }
  if (current.length) segments.push(current);
  return segments;
}

export default function WeightChart({ data, birthday, id }: WeightChartProps) {
  const [mode, setMode] = useState<ChartMode>('both');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 288 });
  const measurements = useMemo(() => data.flatMap((item) => {
    const day = dateDay(item.date);
    return day !== null && Number.isFinite(item.weight) && item.weight > 0 ? [{ ...item, day }] : [];
  }).sort((a, b) => a.day - b.day), [data]);
  const hasMeasurements = measurements.length > 0;
  const birthDay = dateDay(birthday);
  const startMeasurement = measurements[0]?.day ?? birthDay ?? 0;
  const endMeasurement = measurements[measurements.length - 1]?.day ?? startMeasurement;
  const singleDate = startMeasurement === endMeasurement;
  const startDay = singleDate ? Math.min(startMeasurement, Math.max(startMeasurement - 7, birthDay ?? startMeasurement - 7)) : startMeasurement;
  const endDay = singleDate ? Math.max(startMeasurement + 7, startDay + 14) : endMeasurement;
  const samples = useMemo(() => referenceSamples(birthday, startDay, endDay), [birthday, startDay, endDay]);

  useEffect(() => {
    const host = canvas.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setSize({ width: Math.max(200, Math.round(entry.contentRect.width)), height: Math.round(entry.contentRect.height) });
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [hasMeasurements]);

  if (!measurements.length) return <div role="region" aria-label="体重标准对照" className="rounded-xl bg-secondary/60 px-4 py-8 text-center text-sm text-muted-foreground">暂无有效体重记录，添加测量后即可查看成长曲线。</div>;

  const shownStandards: Standard[] = mode === 'both' ? ['WHO', 'CN'] : mode === 'measured' ? [] : [mode];
  const percentiles: Percentile[] = mode === 'both' ? ['p50'] : ['p3', 'p50', 'p97'];
  const rangeValues = samples.flatMap((sample) => shownStandards.flatMap((standard) => {
    const reference = sample.values[standard];
    return reference ? percentiles.map((percentile) => reference[percentile]) : [];
  }));
  const weights = [...measurements.map((item) => item.weight), ...rangeValues].filter(Number.isFinite);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const weightPadding = Math.max(0.25, (maximum - minimum) * 0.15);
  const domainMinimum = Math.max(0, Math.floor((minimum - weightPadding) * 10) / 10);
  const domainMaximum = Math.ceil((maximum + weightPadding) * 10) / 10;
  const domainRange = Math.max(0.1, domainMaximum - domainMinimum);
  const { width, height } = size;
  const padding = { top: 20, right: 16, bottom: 32, left: 40 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (day: number) => padding.left + ((day - startDay) / Math.max(1, endDay - startDay)) * plotWidth;
  const y = (weight: number) => padding.top + ((domainMaximum - weight) / domainRange) * plotHeight;
  const coordinate = (day: number, weight: number) => `${x(day).toFixed(2)},${y(weight).toFixed(2)}`;
  const measuredPath = measurements.map((item, index) => `${index ? 'L' : 'M'}${coordinate(item.day, item.weight)}`).join(' ');
  const linePath = (standard: Standard, percentile: Percentile) => referenceSegments(samples, standard).map((segment) =>
    segment.map((sample, index) => `${index ? 'L' : 'M'}${coordinate(sample.day, sample.values[standard]![percentile])}`).join(' ')
  ).join(' ');
  const bandPath = (standard: Standard) => referenceSegments(samples, standard).filter((segment) => segment.length > 1).map((segment) => {
    const upper = segment.map((sample, index) => `${index ? 'L' : 'M'}${coordinate(sample.day, sample.values[standard]!.p97)}`).join(' ');
    const lower = [...segment].reverse().map((sample) => `L${coordinate(sample.day, sample.values[standard]!.p3)}`).join(' ');
    return `${upper} ${lower} Z`;
  }).join(' ');
  const rangePath = shownStandards.length === 1 ? bandPath(shownStandards[0]) : '';
  const dateTicks = [...new Set([startDay, Math.floor((startDay + endDay) / 2), endDay])];
  const crossesYear = dayDate(startDay).slice(0, 4) !== dayDate(endDay).slice(0, 4);
  const candidateIndex = previewIndex ?? selectedIndex;
  const activeIndex = candidateIndex !== null && candidateIndex < measurements.length ? candidateIndex : null;
  const activeItem = activeIndex === null ? null : measurements[activeIndex];
  const activeReferences = activeItem ? getMaleWeightReferences(birthday, activeItem.date) : null;
  const missingStandards = shownStandards.filter((standard) => !samples.some((sample) => sample.values[standard]));
  const partialStandards = shownStandards.filter((standard) => !missingStandards.includes(standard) && samples.some((sample) => !sample.values[standard]));
  const toggleSelectedIndex = (index: number) => setSelectedIndex((current) => current === index ? null : index);

  const handleChartClick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width) return;
    const chartX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nearestIndex = measurements.reduce((nearest, item, index) => Math.abs(x(item.day) - chartX) < Math.abs(x(measurements[nearest].day) - chartX) ? index : nearest, 0);
    toggleSelectedIndex(nearestIndex);
  };
  const handlePointPointerEnter = (event: PointerEvent<SVGCircleElement>, index: number) => { if (event.pointerType === 'mouse') setPreviewIndex(index); };
  const handlePointPointerLeave = (event: PointerEvent<SVGCircleElement>) => { if (event.pointerType === 'mouse') setPreviewIndex(null); };
  const handlePointKeyDown = (event: KeyboardEvent<SVGCircleElement>, index: number) => {
    if (event.key === 'Escape') { setSelectedIndex(null); setPreviewIndex(null); return; }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); event.stopPropagation(); toggleSelectedIndex(index);
  };

  return (
    <div role="region" aria-label="体重标准对照" className="min-w-0" data-chart-mode={mode}>
      <div role="group" aria-label="选择对照标准" className="mb-4 flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-[#edf1e8] p-1">
        {modes.map((item) => <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => setMode(item.value)} className={`min-h-9 rounded-lg px-2.5 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs ${mode === item.value ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:bg-white/70 hover:text-primary'}`}>{item.label}</button>)}
      </div>
      <div aria-label="图例" className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-5 rounded-full bg-[#315b46]" />实测体重</span>
        {shownStandards.map((standard) => <span key={standard} className="inline-flex items-center gap-1.5"><svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={standards[standard].color} strokeWidth="2" strokeDasharray={standards[standard].dash} /></svg>{standards[standard].name} P50</span>)}
        {shownStandards.length === 1 && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: `${standards[shownStandards[0]].color}26` }} />P3–P97</span>}
      </div>

      <div ref={canvas} className="h-56 w-full sm:h-72">
        <svg id={`${id}-chart`} className="h-full w-full touch-manipulation" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="体重趋势图，点按图表可查看最近数据点的日期和体重" onClick={handleChartClick}>
          <text x={padding.left - 10} y="11" textAnchor="end" fontSize="10" fill="#82917b">kg</text>
          {Array.from({ length: 4 }, (_, index) => domainMaximum - (index / 3) * domainRange).map((value) => <g key={value}><line x1={padding.left} x2={padding.left + plotWidth} y1={y(value)} y2={y(value)} stroke="#e6ebe0" strokeDasharray="3 4" /><text x={padding.left - 9} y={y(value) + 4} textAnchor="end" fontSize="11" fill="#82917b">{value.toFixed(1)}</text></g>)}
          {rangePath && <path d={rangePath} fill={standards[shownStandards[0]].color} fillOpacity="0.10" data-standard={shownStandards[0]} data-percentile="range" aria-hidden="true" />}
          {shownStandards.map((standard) => percentiles.map((percentile) => {
            const path = linePath(standard, percentile);
            return path ? <path key={`${standard}-${percentile}`} d={path} fill="none" stroke={standards[standard].color} strokeWidth={percentile === 'p50' ? 1.8 : 1} strokeOpacity={percentile === 'p50' ? 0.95 : 0.55} strokeDasharray={percentile === 'p50' ? standards[standard].dash : '3 4'} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" data-standard={standard} data-percentile={percentile} aria-hidden="true" /> : null;
          }))}
          {activeItem && <line x1={x(activeItem.day)} x2={x(activeItem.day)} y1={padding.top} y2={padding.top + plotHeight} stroke="#b2c2a7" strokeDasharray="3 4" aria-hidden="true" />}
          <path d={measuredPath} fill="none" stroke="#315b46" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" data-series="measured" />
          {measurements.map((item, index) => <g key={`${item.date}-${index}`}>
            <circle cx={x(item.day)} cy={y(item.weight)} r="14" fill="transparent" className="cursor-crosshair outline-none" tabIndex={0} role="button" aria-label={`${item.date}，体重 ${item.weight} 千克`} aria-pressed={selectedIndex === index} aria-describedby={activeIndex === index ? `${id}-point-detail` : undefined} onClick={(event) => { event.stopPropagation(); toggleSelectedIndex(index); }} onPointerEnter={(event) => handlePointPointerEnter(event, index)} onPointerLeave={handlePointPointerLeave} onFocus={() => setPreviewIndex(index)} onBlur={() => setPreviewIndex(null)} onKeyDown={(event) => handlePointKeyDown(event, index)} />
            <circle cx={x(item.day)} cy={y(item.weight)} r={activeIndex === index ? 5 : 3.5} fill="#fff" stroke="#315b46" strokeWidth={activeIndex === index ? 3 : 2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          </g>)}
          {dateTicks.map((day, index) => <text key={day} x={x(day)} y={height - 9} textAnchor={index === 0 ? 'start' : index === dateTicks.length - 1 ? 'end' : 'middle'} fontSize={crossesYear && width < 380 ? 9 : 11} fill="#82917b">{crossesYear ? dayDate(day) : dayDate(day).slice(5)}</text>)}
        </svg>
      </div>

      <div className="mt-2 min-h-12 rounded-xl bg-[#f4f7ef] px-3 py-2.5 text-[11px] leading-6" aria-live="polite">
        {activeItem ? <div id={`${id}-point-detail`} role="tooltip" className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
          <time className="text-muted-foreground" dateTime={activeItem.date}>{activeItem.date}</time>
          <span className="font-semibold text-primary">实测 {activeItem.weight} kg</span>
          {shownStandards.map((standard) => <span key={standard} style={{ color: standards[standard].color }}>{standards[standard].name} P50 {activeReferences?.[standard] ? `${activeReferences[standard]!.p50.toFixed(2)} kg` : '暂无参考'}</span>)}
        </div> : <p className="text-muted-foreground">点按测量点查看详情，也可用键盘选择。</p>}
      </div>
      {missingStandards.length > 0 && <p className="mt-3 text-[11px] leading-6 text-[#8a704a]">{missingStandards.map((standard) => standards[standard].name).join('、')}在当前日期范围内没有适用参考，实测记录照常显示。</p>}
      {partialStandards.length > 0 && <p className="mt-2 text-[11px] leading-6 text-muted-foreground">部分日期超出{partialStandards.map((standard) => standards[standard].name).join('、')}的参考范围，曲线仅显示有参考值的日期。</p>}
      <div className="mt-3 space-y-1 text-[10px] leading-5 text-muted-foreground">
        <p>{mode === 'measured' ? '按实际测量日期展示体重。' : `男童体重年龄标准。${mode === 'both' ? '双标准对照 P50 中位数；切换单标准可查看 P3–P97 百分位范围。' : 'P50 为同龄中位数，浅色带为 P3–P97 百分位范围。'}`}</p>
        <p>来源：<a href="https://www.who.int/toolkits/child-growth-standards/standards/weight-for-age" target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:text-primary">WHO（0–731 天）</a><span className="mx-1.5">·</span><a href="https://www.nhc.gov.cn/cms-search/downFiles/e38068f0a62d4a1eb1bd451414444ec1.pdf" target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:text-primary">中国 WS/T 423—2022（至 81 月龄）</a></p>
        {mode !== 'WHO' && mode !== 'measured' && <p>中国标准按日龄 ÷ 30.4375 估算月龄，并在月龄表节点间线性插值。</p>}
      </div>
    </div>
  );
}
