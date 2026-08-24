import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeightChartProps = {
  data: Array<{ date: string; weight: number; height: number; head: number }>;
  id: string;
};

export default function WeightChart({ data, id }: WeightChartProps) {
  const weights = data.map((item) => item.weight);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const padding = Math.max(0.15, (maximum - minimum) * 0.35);
  const domainMinimum = Math.max(0, Math.floor((minimum - padding) * 10) / 10);
  const domainMaximum = Math.ceil((maximum + padding) * 10) / 10;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.24} />
            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} minTickGap={28} tickMargin={10} />
        <YAxis domain={[domainMinimum, domainMaximum]} tickCount={4} tickLine={false} axisLine={false} fontSize={11} width={42} tickMargin={8} tickFormatter={(value: number) => value.toFixed(1)} />
        <Tooltip cursor={{ stroke: "#bae6fd", strokeWidth: 1 }} contentStyle={{ border: "1px solid #e7e5e4", borderRadius: 6, boxShadow: "0 8px 24px rgba(28,25,23,0.08)", fontSize: 12 }} labelStyle={{ color: "#57534e", marginBottom: 4 }} itemStyle={{ color: "#0369a1" }} formatter={(value) => [`${value} kg`, "体重"]} />
        <Area type="monotone" dataKey="weight" stroke="#0284c7" fill={`url(#${id})`} strokeWidth={2.25} dot={data.length <= 12 ? { r: 2.5, fill: "#ffffff", stroke: "#0284c7", strokeWidth: 2 } : false} activeDot={{ r: 4, fill: "#0284c7", stroke: "#ffffff", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
