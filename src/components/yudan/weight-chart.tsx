import { useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

type WeightChartProps = {
  data: Array<{ date: string; weight: number; height: number; head: number }>;
  id: string;
};

export default function WeightChart({ data, id }: WeightChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const width = 640;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 36, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const weights = data.map((item) => item.weight);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const weightPadding = Math.max(0.15, (maximum - minimum) * 0.35);
  const domainMinimum = Math.max(0, Math.floor((minimum - weightPadding) * 10) / 10);
  const domainMaximum = Math.ceil((maximum + weightPadding) * 10) / 10;
  const domainRange = Math.max(0.1, domainMaximum - domainMinimum);
  const x = (index: number) =>
    data.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (data.length - 1)) * plotWidth;
  const y = (weight: number) =>
    padding.top + ((domainMaximum - weight) / domainRange) * plotHeight;
  const points = data.map((item, index) => `${x(index)},${y(item.weight)}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + plotHeight} ${points} ${padding.left + plotWidth},${padding.top + plotHeight}`;
  const labelIndexes = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]));
  const gridValues = Array.from({ length: 4 }, (_, index) =>
    domainMaximum - (index / 3) * domainRange
  );
  const activeIndex = previewIndex ?? selectedIndex;
  const activeItem = activeIndex === null ? null : data[activeIndex];
  const activeX = activeIndex === null ? 0 : x(activeIndex);
  const activeY = activeItem ? y(activeItem.weight) : 0;
  const tooltipWidth = 132;
  const tooltipHeight = 52;
  const tooltipX = Math.min(
    width - padding.right - tooltipWidth,
    Math.max(padding.left, activeX - tooltipWidth / 2)
  );
  const tooltipY = activeY - tooltipHeight - 14 < padding.top
    ? Math.min(padding.top + plotHeight - tooltipHeight, activeY + 14)
    : activeY - tooltipHeight - 14;

  const toggleSelectedIndex = (index: number) => {
    setSelectedIndex((current) => current === index ? null : index);
  };

  const handleChartClick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartX = ((event.clientX - bounds.left) / bounds.width) * width;
    const nearestIndex = data.reduce(
      (nearest, _item, index) =>
        Math.abs(x(index) - chartX) < Math.abs(x(nearest) - chartX) ? index : nearest,
      0
    );

    toggleSelectedIndex(nearestIndex);
  };

  const handlePointPointerEnter = (event: PointerEvent<SVGCircleElement>, index: number) => {
    if (event.pointerType === "mouse") setPreviewIndex(index);
  };

  const handlePointPointerLeave = (event: PointerEvent<SVGCircleElement>) => {
    if (event.pointerType === "mouse") setPreviewIndex(null);
  };

  const handlePointKeyDown = (event: KeyboardEvent<SVGCircleElement>, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    toggleSelectedIndex(index);
  };

  return (
    <svg
      className="h-full w-full touch-manipulation"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="体重趋势图，点按图表可查看最近数据点的日期和体重"
      onClick={handleChartClick}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#0284c7" stopOpacity="0.24" />
          <stop offset="95%" stopColor="#0284c7" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridValues.map((value) => {
        const gridY = y(value);
        return (
          <g key={value}>
            <line x1={padding.left} x2={padding.left + plotWidth} y1={gridY} y2={gridY} stroke="#e7e5e4" strokeDasharray="4 4" />
            <text x={padding.left - 9} y={gridY + 4} textAnchor="end" fontSize="11" fill="#78716c">{value.toFixed(1)}</text>
          </g>
        );
      })}
      <polygon points={areaPoints} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data.map((item, index) => (
        <g key={`${item.date}-${item.weight}`}>
          <circle
            cx={x(index)}
            cy={y(item.weight)}
            r="16"
            fill="transparent"
            className="cursor-crosshair outline-none"
            tabIndex={0}
            role="button"
            aria-label={`${item.date}，体重 ${item.weight} 千克`}
            onPointerEnter={(event) => handlePointPointerEnter(event, index)}
            onPointerLeave={handlePointPointerLeave}
            onFocus={() => setPreviewIndex(index)}
            onBlur={() => setPreviewIndex(null)}
            onKeyDown={(event) => handlePointKeyDown(event, index)}
          />
          <circle
            cx={x(index)}
            cy={y(item.weight)}
            r={activeIndex === index ? "5" : "3.5"}
            fill="#ffffff"
            stroke="#0284c7"
            strokeWidth={activeIndex === index ? "3" : "2"}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        </g>
      ))}
      {activeItem && (
        <g pointerEvents="none">
          <line
            x1={activeX}
            x2={activeX}
            y1={activeY + 8}
            y2={padding.top + plotHeight}
            stroke="#7dd3fc"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <rect
            x={tooltipX}
            y={tooltipY}
            width={tooltipWidth}
            height={tooltipHeight}
            rx="10"
            fill="#0c4a6e"
          />
          <text x={tooltipX + 12} y={tooltipY + 20} fontSize="11" fill="#bae6fd">
            {activeItem.date}
          </text>
          <text x={tooltipX + 12} y={tooltipY + 40} fontSize="14" fontWeight="700" fill="#ffffff">
            {activeItem.weight} kg
          </text>
        </g>
      )}
      {labelIndexes.map((index) => (
        <text key={data[index].date} x={x(index)} y={height - 10} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} fontSize="11" fill="#78716c">
          {data[index].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}
