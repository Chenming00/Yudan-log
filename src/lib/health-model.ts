import { YUDAN_BIRTHDAY } from "./yudan-profile";
import type { HealthMutation } from "./health-records";

export type GrowthEntry = {
  id: string;
  date: string;
  weight: number;
  height: number;
  head: number;
  note: string;
  updatedAt?: string;
};

export type VaccineType = "free" | "paid";
export type VaccineStatus = "planned" | "booked" | "done" | "delayed" | "skipped";

export type VaccineEntry = {
  id: string;
  planId?: string;
  updatedAt?: string;
  ageLabel: string;
  ageMonths: number;
  vaccine: string;
  dose: string;
  type: VaccineType;
  route: string;
  disease: string;
  note: string;
  alternative?: string;
  status: VaccineStatus;
  plannedDate: string;
  bookedDate: string;
  doneDate: string;
  place: string;
  batchNo: string;
  manufacturer: string;
  reminder: string;
  dateRule?: "flu-season";
  dateOffsetDays?: number;
};

export type CareEntry = {
  id: string;
  time: string;
  type: "feed" | "sleep" | "diaper" | "medicine" | "note";
  title: string;
  detail: string;
};

export type DashboardData = {
  birthday: string;
  growth: GrowthEntry[];
  vaccines: VaccineEntry[];
  care: CareEntry[];
};

export type YudanDashboardProps = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  view?: "dashboard" | "health";
};

export type CloudVaccineRecord = {
  id: string;
  plan_id: string;
  administered_on: string;
  updated_at: string;
  place: string;
  batch_no: string;
  manufacturer: string;
  note: string;
};

export type CloudWeightRecord = {
  id: string;
  measured_on: string;
  weight_kg: number | string;
  height_cm: number | string | null;
  head_circumference_cm: number | string | null;
  updated_at: string;
  note: string;
};

export type CloudDashboardRow = {
  birthday: string;
};

export type CloudVaccinePlan = {
  id: string;
  sort_order: number;
  active?: boolean;
  age_months: number;
  age_label: string;
  vaccine: string;
  dose: string;
  funding: VaccineType;
  date_rule: "flu-season" | null;
  date_offset_days: number;
  region: string;
  schedule_version: string;
  prevents: string;
  aliases: string[];
  audience: string | null;
  schedule_note: string | null;
  source: string;
};

export type SyncStatus = "local" | "loading" | "saving" | "saved" | "error" | "pending" | "conflict";

export type VaccineFilter = "all" | "free" | "paid";

export function toDateValue(date: Date) { return date.toISOString().slice(0, 10); }



export type VaccineTemplate = Omit<
  VaccineEntry,
  "id" | "plannedDate" | "bookedDate" | "doneDate" | "place" | "batchNo" | "manufacturer" | "reminder"
>;

export function vaccineAt(
  ageMonths: number,
  ageLabel: string,
  vaccine: string,
  dose: string,
  type: VaccineType,
  options: Partial<VaccineTemplate> = {}
): VaccineTemplate {
  return {
    ageMonths,
    ageLabel,
    vaccine,
    dose,
    type,
    route: "",
    disease: "",
    note: "",
    status: "planned",
    ...options,
  };
}

const vaccineTemplates: VaccineTemplate[] = [
  vaccineAt(0, "出生后 24 小时内", "乙肝疫苗", "第 1 剂", "free"),
  vaccineAt(0, "出生时", "卡介苗", "1 剂", "free"),
  vaccineAt(1, "1 月龄", "乙肝疫苗", "第 2 剂", "free"),

  vaccineAt(2, "2 月龄", "脊灰灭活疫苗 IPV", "第 1 剂", "free"),
  vaccineAt(2, "2 月龄", "百白破疫苗 DTaP", "第 1 剂", "free"),
  vaccineAt(2, "2 月龄", "肺炎球菌结合疫苗 PCV", "第 1 剂", "paid"),
  vaccineAt(2, "2 月龄", "Hib 疫苗", "第 1 剂", "paid"),
  vaccineAt(2, "2 月龄", "轮状病毒疫苗", "第 1 剂", "paid"),

  vaccineAt(3, "3 月龄", "脊灰灭活疫苗 IPV", "第 2 剂", "free"),

  vaccineAt(4, "4 月龄", "脊灰减毒活疫苗 bOPV", "第 3 剂", "free"),
  vaccineAt(4, "4 月龄", "百白破疫苗 DTaP", "第 2 剂", "free"),
  vaccineAt(4, "4 月龄", "肺炎球菌结合疫苗 PCV", "第 2 剂", "paid"),
  vaccineAt(4, "4 月龄", "Hib 疫苗", "第 2 剂", "paid"),
  vaccineAt(4, "4 月龄", "轮状病毒疫苗", "第 2 剂", "paid"),

  vaccineAt(6, "6 月龄", "乙肝疫苗", "第 3 剂", "free"),
  vaccineAt(6, "6 月龄", "百白破疫苗 DTaP", "第 3 剂", "free"),
  vaccineAt(6, "6 月龄", "A 群流脑多糖疫苗", "第 1 剂", "free"),
  vaccineAt(6, "6 月龄", "肺炎球菌结合疫苗 PCV", "第 3 剂", "paid"),
  vaccineAt(6, "6 月龄（三剂基础程序）", "Hib 疫苗", "第 3 剂", "paid"),
  vaccineAt(6, "6 月龄（三剂程序）", "轮状病毒疫苗", "第 3 剂", "paid"),
  vaccineAt(6, "满 6 月龄后的首个流感季", "流感疫苗", "首季第 1 剂", "paid", { dateRule: "flu-season" }),
  vaccineAt(6, "首剂后至少 4 周", "流感疫苗", "首季第 2 剂", "paid", { dateRule: "flu-season", dateOffsetDays: 28 }),
  vaccineAt(6, "6 月龄", "EV71 手足口疫苗", "第 1 剂", "paid"),
  vaccineAt(7, "首剂后 1 个月", "EV71 手足口疫苗", "第 2 剂", "paid"),

  vaccineAt(8, "8 月龄", "麻腮风疫苗 MMR", "第 1 剂", "free"),
  vaccineAt(8, "8 月龄", "乙脑减毒活疫苗", "第 1 剂", "free"),

  vaccineAt(9, "9 月龄", "A 群流脑多糖疫苗", "第 2 剂", "free"),

  vaccineAt(12, "12-15 月龄", "肺炎球菌结合疫苗 PCV", "加强剂", "paid"),
  vaccineAt(12, "12-15 月龄", "Hib 疫苗", "加强剂", "paid"),
  vaccineAt(12, "12-15 月龄", "水痘疫苗", "第 1 剂", "paid"),

  vaccineAt(18, "18 月龄", "麻腮风疫苗 MMR", "第 2 剂", "free"),
  vaccineAt(18, "18 月龄", "百白破疫苗 DTaP", "第 4 剂", "free"),
  vaccineAt(18, "18 月龄", "甲肝减毒活疫苗", "1 剂", "free"),
  vaccineAt(18, "第 2 个流感季", "流感疫苗", "年度接种", "paid", { dateRule: "flu-season" }),

  vaccineAt(24, "2 周岁", "乙脑减毒活疫苗", "第 2 剂", "free"),
  vaccineAt(30, "第 3 个流感季", "流感疫苗", "年度接种", "paid", { dateRule: "flu-season" }),

  vaccineAt(36, "3 周岁", "流脑疫苗（A 群 C 群）", "第 3 剂", "free"),
  vaccineAt(42, "第 4 个流感季", "流感疫苗", "年度接种", "paid", { dateRule: "flu-season" }),

  vaccineAt(48, "4 周岁", "脊灰减毒活疫苗 bOPV", "第 4 剂", "free"),
  vaccineAt(48, "4-6 周岁", "水痘疫苗", "第 2 剂", "paid"),
  vaccineAt(54, "第 5 个流感季", "流感疫苗", "年度接种", "paid", { dateRule: "flu-season" }),
  vaccineAt(66, "第 6 个流感季", "流感疫苗", "年度接种", "paid", { dateRule: "flu-season" }),

  vaccineAt(72, "6 周岁", "百白破疫苗 DTaP", "第 5 剂", "free"),
  vaccineAt(72, "6 周岁", "流脑疫苗（A 群 C 群）", "第 4 剂", "free"),
  vaccineAt(156, "13 周岁（女孩）", "双价 HPV 疫苗 2vHPV", "第 1 剂", "free"),
  vaccineAt(162, "首剂后 6 个月（女孩）", "双价 HPV 疫苗 2vHPV", "第 2 剂", "free"),
];
export function addMonths(dateString: string, months: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() < day) date.setUTCDate(0);
  return toDateValue(date);
}

export function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateValue(date);
}

export function fluSeasonDate(earliestDate: string) {
  const earliest = new Date(`${earliestDate}T00:00:00Z`);
  const month = earliest.getUTCMonth() + 1;
  if (month >= 4 && month <= 8) {
    earliest.setUTCMonth(8, 15);
  }
  return toDateValue(earliest);
}

export function plannedDateForTemplate(birthday: string, template: VaccineTemplate) {
  let date = addMonths(birthday, template.ageMonths);
  if (template.dateRule === "flu-season") date = fluSeasonDate(date);
  if (template.dateOffsetDays) date = addDays(date, template.dateOffsetDays);
  return date;
}

export function createVaccineSchedule(birthday: string): VaccineEntry[] {
  return vaccineTemplates.map((template, index) => ({
    ...template,
    id: `vaccine-${index + 1}`,
    planId: `schedule-${String(index + 1).padStart(3, "0")}`,
    plannedDate: plannedDateForTemplate(birthday, template),
    bookedDate: "",
    doneDate: "",
    place: "",
    batchNo: "",
    manufacturer: "",
    reminder: template.type === "free" ? "提前 7 天确认门诊时间" : "先咨询库存、品牌和价格",
  }));
}

export function createVaccineScheduleFromCatalog(
  birthday: string,
  catalog: CloudVaccinePlan[]
): VaccineEntry[] {
  return [...catalog]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((plan) => {
      const template: VaccineTemplate = {
        ageMonths: plan.age_months,
        ageLabel: plan.age_label,
        vaccine: plan.vaccine,
        dose: plan.dose,
        type: plan.funding,
        route: "",
        disease: plan.prevents || "",
        note: plan.schedule_note || "",
        status: "planned",
        dateRule: plan.date_rule || undefined,
        dateOffsetDays: plan.date_offset_days || undefined,
      };
      return {
        ...template,
        id: plan.id,
        planId: plan.id,
        plannedDate: plannedDateForTemplate(birthday, template),
        bookedDate: "",
        doneDate: "",
        place: "",
        batchNo: "",
        manufacturer: "",
        reminder: plan.funding === "free" ? "提前 7 天确认门诊时间" : "先咨询库存、品牌和价格",
      };
    });
}

export function scheduleForBirthday(birthday: string, catalog: CloudVaccinePlan[]) {
  return catalog.length
    ? createVaccineScheduleFromCatalog(birthday, catalog)
    : createVaccineSchedule(birthday);
}

export const defaultBirthday = YUDAN_BIRTHDAY;

export const defaultData: DashboardData = {
  birthday: defaultBirthday,
  growth: [],
  vaccines: createVaccineSchedule(defaultBirthday),
  care: [],
};

const previewBirthday = YUDAN_BIRTHDAY;
const previewVaccines = createVaccineSchedule(previewBirthday).map((item, index) =>
  index < 2 ? { ...item, doneDate: item.plannedDate, status: "done" as VaccineStatus } : item
);
export const previewData: DashboardData = {
  birthday: previewBirthday,
  growth: [
    { id: "preview-weight-1", date: previewBirthday, weight: 3.4, height: 0, head: 0, note: "" },
    { id: "preview-weight-2", date: "2026-08-16", weight: 3.32, height: 0, head: 0, note: "" },
    { id: "preview-weight-3", date: "2026-08-21", weight: 3.56, height: 0, head: 0, note: "" },
  ],
  vaccines: previewVaccines,
  care: [],
};

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function daysBetween(start: string, end: string) {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return 0;
  return Math.floor((endTime - startTime) / 86400000);
}

export function formatDate(date: string) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function readStoredData(userId?: string): DashboardData {
  if (typeof window === "undefined") return defaultData;

  try {
    const scopedKey = userId ? `yudan-dashboard-v2:${userId}` : "yudan-dashboard-v2";
    const scopedRaw = window.localStorage.getItem(scopedKey);
    const legacyRaw = !userId
      ? window.localStorage.getItem("yudan-dashboard-v2")
      : null;
    const raw = scopedRaw || legacyRaw;
    if (raw) {
      const stored = JSON.parse(raw) as Partial<DashboardData>;
      const birthday = defaultBirthday;
      const storedVaccines = stored.vaccines || [];
      return {
        ...defaultData,
        ...stored,
        birthday,
        growth: stored.growth || defaultData.growth,
        care: stored.care || defaultData.care,
        vaccines: storedVaccines.length ? storedVaccines : createVaccineSchedule(birthday).map((fresh) => {
          const previous = storedVaccines.find(
            (item) => item.vaccine === fresh.vaccine && item.dose === fresh.dose && item.ageLabel === fresh.ageLabel
          );
          return previous ? { ...fresh, ...previous, plannedDate: fresh.plannedDate } : fresh;
        }),
      };
    }

    const oldRaw = !userId
      ? window.localStorage.getItem("yudan-dashboard-v1")
      : null;
    if (!oldRaw) return defaultData;
    const oldData = JSON.parse(oldRaw) as Partial<DashboardData>;
    return {
      ...defaultData,
      birthday: defaultBirthday,
      growth: oldData.growth || defaultData.growth,
      care: oldData.care || defaultData.care,
      vaccines: createVaccineSchedule(defaultBirthday),
    };
  } catch {
    return defaultData;
  }
}

export function dashboardFromCloud(
  row: CloudDashboardRow,
  weightRecords: CloudWeightRecord[],
  vaccineRecords: CloudVaccineRecord[],
  localData: DashboardData,
  catalog: CloudVaccinePlan[]
): DashboardData {
  const birthday = row.birthday || defaultBirthday;

  return {
    ...localData,
    birthday,
    vaccines: scheduleForBirthday(birthday, catalog.filter((plan) => plan.active !== false || vaccineRecords.some((record) => record.plan_id === plan.id))).map((fresh) => {
      const stored = vaccineRecords.find(
        (item) => item.plan_id === fresh.planId || item.plan_id === fresh.id
      );
      return stored
        ? { ...fresh, doneDate: stored.administered_on, status: "done", updatedAt: stored.updated_at, place: stored.place || "", batchNo: stored.batch_no || "", manufacturer: stored.manufacturer || "", note: stored.note || "" }
        : fresh;
    }),
    growth: weightRecords.map((item) => ({
      id: item.id,
      updatedAt: item.updated_at,
      date: item.measured_on,
      weight: Number(item.weight_kg),
      height: item.height_cm === null ? 0 : Number(item.height_cm),
      head: item.head_circumference_cm === null ? 0 : Number(item.head_circumference_cm),
      note: item.note || "",
    })),
  };
}

export function applyHealthMutation(data: DashboardData, mutation: HealthMutation): DashboardData {
  if (mutation.kind === 'weight') {
    const existing = data.growth.find((item) => item.date === mutation.key);
    const rest = data.growth.filter((item) => item.date !== mutation.key);
    if (mutation.action === 'delete') return { ...data, growth: rest };
    return { ...data, growth: [...rest, {
      id: existing?.id || `draft-${mutation.request_id}`, date: mutation.key,
      height: 0, head: 0, note: '', ...existing, weight: mutation.changes.weight_kg!,
    }] };
  }
  return { ...data, vaccines: data.vaccines.map((item) => item.planId === mutation.key ? {
    ...item, doneDate: mutation.action === 'delete' ? '' : mutation.changes.administered_on!,
    status: mutation.action === 'delete' ? 'planned' : 'done',
  } : item) };
}
