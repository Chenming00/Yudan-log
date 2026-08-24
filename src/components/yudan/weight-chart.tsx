type WeightChartProps = {
  data: Array<{ date: string; weight: number; height: number; head: number }>;
  id: string;
};

export default function WeightChart({ data, id }: WeightChartProps) {
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

  return (
    <svg
      className="h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="体重趋势图"
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
      {data.length <= 12 && data.map((item, index) => (
        <circle key={`${item.date}-${item.weight}`} cx={x(index)} cy={y(item.weight)} r="3.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" vectorEffect="non-scaling-stroke">
          <title>{`${item.date}: ${item.weight} kg`}</title>
        </circle>
      ))}
      {labelIndexes.map((index) => (
        <text key={data[index].date} x={x(index)} y={height - 10} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} fontSize="11" fill="#78716c">
          {data[index].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}
