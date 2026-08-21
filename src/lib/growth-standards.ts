import whoMaleWeightRows from "@/src/data/who-wfa-boys-0-2.json";

export type WeightAssessment = {
  source: "WHO" | "CN";
  sourceLabel: string;
  ageLabel: string;
  percentile: number;
  percentileLabel: string;
  low: number;
  median: number;
  high: number;
  position: string;
  sourceUrl: string;
};

type ChinaWeightRow = [months: number, p3: number, p10: number, p25: number, p50: number, p75: number, p90: number, p97: number];

const CHINA_MALE_WEIGHT: ChinaWeightRow[] = [
  [0, 2.8, 3.0, 3.2, 3.5, 3.7, 4.0, 4.2],
  [1, 3.7, 3.9, 4.2, 4.6, 4.9, 5.2, 5.6],
  [2, 4.7, 5.0, 5.4, 5.8, 6.2, 6.7, 7.1],
  [3, 5.5, 5.9, 6.3, 6.8, 7.3, 7.8, 8.3],
  [4, 6.1, 6.5, 7.0, 7.5, 8.1, 8.6, 9.2],
  [5, 6.6, 7.0, 7.5, 8.0, 8.6, 9.2, 9.8],
  [6, 6.9, 7.4, 7.9, 8.4, 9.1, 9.7, 10.3],
  [7, 7.2, 7.7, 8.2, 8.8, 9.5, 10.1, 10.8],
  [8, 7.5, 8.0, 8.5, 9.1, 9.8, 10.4, 11.1],
  [9, 7.7, 8.2, 8.7, 9.4, 10.1, 10.8, 11.5],
  [10, 7.9, 8.4, 9.0, 9.6, 10.3, 11.0, 11.8],
  [11, 8.1, 8.6, 9.2, 9.8, 10.6, 11.3, 12.0],
  [12, 8.3, 8.8, 9.4, 10.1, 10.8, 11.5, 12.3],
  [13, 8.4, 9.0, 9.6, 10.3, 11.0, 11.7, 12.5],
  [14, 8.6, 9.2, 9.7, 10.5, 11.2, 12.0, 12.8],
  [15, 8.8, 9.3, 9.9, 10.7, 11.4, 12.2, 13.0],
  [16, 9.0, 9.5, 10.1, 10.9, 11.7, 12.4, 13.3],
  [17, 9.1, 9.7, 10.3, 11.1, 11.9, 12.7, 13.5],
  [18, 9.3, 9.9, 10.5, 11.3, 12.1, 12.9, 13.8],
  [19, 9.5, 10.1, 10.7, 11.5, 12.3, 13.2, 14.0],
  [20, 9.7, 10.3, 10.9, 11.7, 12.6, 13.4, 14.3],
  [21, 9.8, 10.5, 11.1, 11.9, 12.8, 13.7, 14.6],
  [22, 10.0, 10.6, 11.3, 12.2, 13.0, 13.9, 14.8],
  [23, 10.2, 10.8, 11.5, 12.4, 13.3, 14.2, 15.1],
  [24, 10.4, 11.0, 11.7, 12.6, 13.5, 14.4, 15.4],
  [27, 10.8, 11.5, 12.2, 13.1, 14.1, 15.1, 16.1],
  [30, 11.2, 12.0, 12.7, 13.7, 14.7, 15.7, 16.7],
  [33, 11.6, 12.4, 13.2, 14.2, 15.2, 16.3, 17.4],
  [36, 12.0, 12.8, 13.6, 14.6, 15.8, 16.9, 18.0],
  [39, 12.4, 13.2, 14.1, 15.2, 16.3, 17.5, 18.7],
  [42, 12.8, 13.7, 14.6, 15.7, 16.9, 18.1, 19.4],
  [45, 13.2, 14.1, 15.1, 16.2, 17.5, 18.7, 20.1],
  [48, 13.6, 14.5, 15.5, 16.7, 18.1, 19.4, 20.8],
  [51, 14.0, 15.0, 16.0, 17.3, 18.7, 20.1, 21.6],
  [54, 14.5, 15.4, 16.5, 17.9, 19.3, 20.8, 22.4],
  [57, 14.9, 15.9, 17.1, 18.4, 20.0, 21.6, 23.3],
  [60, 15.3, 16.4, 17.6, 19.1, 20.7, 22.4, 24.2],
  [63, 15.8, 16.9, 18.1, 19.7, 21.4, 23.2, 25.1],
  [66, 16.2, 17.4, 18.7, 20.3, 22.2, 24.0, 26.0],
  [69, 16.6, 17.9, 19.3, 21.0, 22.9, 24.8, 27.0],
  [72, 17.1, 18.3, 19.8, 21.6, 23.6, 25.7, 27.9],
  [75, 17.5, 18.8, 20.3, 22.2, 24.3, 26.5, 28.9],
  [78, 17.8, 19.2, 20.8, 22.8, 25.0, 27.3, 29.8],
  [81, 18.2, 19.7, 21.3, 23.4, 25.7, 28.0, 30.6],
];

const PERCENTILES = [3, 10, 25, 50, 75, 90, 97];

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function ageInDays(birthday: string, measuredAt: string) {
  return Math.floor((parseDate(measuredAt).getTime() - parseDate(birthday).getTime()) / 86_400_000);
}

function normalCdf(z: number) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function percentileLabel(percentile: number) {
  if (percentile < 1) return "P<1";
  if (percentile > 99) return "P>99";
  return `P${Math.round(percentile)}`;
}

function whoPosition(percentile: number) {
  if (percentile < 2.3) return "低于参考区间";
  if (percentile < 15.9) return "偏低位置";
  if (percentile <= 84.1) return "中间位置";
  if (percentile <= 97.7) return "偏高位置";
  return "高于参考区间";
}

function chinaPosition(percentile: number) {
  if (percentile < 3) return "下";
  if (percentile < 25) return "中下";
  if (percentile < 75) return "中";
  if (percentile < 97) return "中上";
  return "上";
}

function interpolatePercentile(weight: number, values: number[]) {
  if (weight <= values[0]) return Math.max(0.1, 3 * weight / values[0]);
  if (weight >= values[6]) return Math.min(99.9, 97 + 3 * (weight - values[6]) / Math.max(0.1, values[6] - values[5]));

  for (let index = 0; index < values.length - 1; index += 1) {
    if (weight <= values[index + 1]) {
      const ratio = (weight - values[index]) / (values[index + 1] - values[index]);
      return PERCENTILES[index] + ratio * (PERCENTILES[index + 1] - PERCENTILES[index]);
    }
  }

  return 50;
}

function getChinaRow(ageMonths: number) {
  if (ageMonths < 0 || ageMonths > 81) return null;
  const nextIndex = CHINA_MALE_WEIGHT.findIndex((row) => row[0] >= ageMonths);
  if (nextIndex <= 0) return CHINA_MALE_WEIGHT[0];
  const next = CHINA_MALE_WEIGHT[nextIndex];
  if (next[0] === ageMonths) return next;
  const previous = CHINA_MALE_WEIGHT[nextIndex - 1];
  const ratio = (ageMonths - previous[0]) / (next[0] - previous[0]);
  return [
    ageMonths,
    ...previous.slice(1).map((value, index) => Number((value + (next[index + 1] - value) * ratio).toFixed(3))),
  ] as ChinaWeightRow;
}

export function getWhoMaleWeightAssessment(birthday: string, measuredAt: string, weight: number): WeightAssessment | null {
  const days = ageInDays(birthday, measuredAt);
  if (days < 0 || days >= whoMaleWeightRows.length || !Number.isFinite(weight) || weight <= 0) return null;
  const [l, m, s, low, median, high] = whoMaleWeightRows[days] as number[];
  const z = Math.abs(l) < 0.000001 ? Math.log(weight / m) / s : (Math.pow(weight / m, l) - 1) / (s * l);
  const percentile = Math.min(99.9, Math.max(0.1, normalCdf(z) * 100));

  return {
    source: "WHO",
    sourceLabel: "WHO 0–2 岁",
    ageLabel: `${days} 天`,
    percentile,
    percentileLabel: percentileLabel(percentile),
    low,
    median,
    high,
    position: whoPosition(percentile),
    sourceUrl: "https://www.who.int/toolkits/child-growth-standards/standards/weight-for-age",
  };
}

export function getChinaMaleWeightAssessment(birthday: string, measuredAt: string, weight: number): WeightAssessment | null {
  const days = ageInDays(birthday, measuredAt);
  const ageMonths = days / 30.4375;
  const row = getChinaRow(ageMonths);
  if (!row || !Number.isFinite(weight) || weight <= 0) return null;
  const values = row.slice(1);
  const percentile = interpolatePercentile(weight, values);

  return {
    source: "CN",
    sourceLabel: "中国 WS/T 423—2022",
    ageLabel: days < 60 ? `${days} 天` : `${Math.floor(ageMonths)} 月龄`,
    percentile,
    percentileLabel: percentileLabel(percentile),
    low: values[0],
    median: values[3],
    high: values[6],
    position: chinaPosition(percentile),
    sourceUrl: "https://www.nhc.gov.cn/cms-search/downFiles/e38068f0a62d4a1eb1bd451414444ec1.pdf",
  };
}

export function getMaleWeightAssessments(birthday: string, measuredAt: string, weight: number) {
  return [
    getWhoMaleWeightAssessment(birthday, measuredAt, weight),
    getChinaMaleWeightAssessment(birthday, measuredAt, weight),
  ].filter((assessment): assessment is WeightAssessment => Boolean(assessment));
}
