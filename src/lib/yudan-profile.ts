export const YUDAN_BIRTHDAY = "2026-08-12";

export type PediatricCareMilestone = {
  id: string;
  label: string;
  date: string;
  weekday: string;
};

export const ZHENGZHENG_CARE_MILESTONES: PediatricCareMilestone[] = [
  { id: "2-weeks", label: "2 周龄", date: "2026-08-26", weekday: "周三" },
  { id: "1-month", label: "1 月龄", date: "2026-09-12", weekday: "周六" },
  { id: "2-months", label: "2 月龄", date: "2026-10-12", weekday: "周一" },
  { id: "4-months", label: "4 月龄", date: "2026-12-12", weekday: "周六" },
  { id: "6-months", label: "6 月龄", date: "2027-02-12", weekday: "周五" },
  { id: "9-months", label: "9 月龄", date: "2027-05-12", weekday: "周三" },
  { id: "1-year", label: "🎂 1 周岁", date: "2027-08-12", weekday: "周四" },
  { id: "15-months", label: "15 月龄", date: "2027-11-12", weekday: "周五" },
  { id: "18-months", label: "18 月龄（1.5 岁）", date: "2028-02-12", weekday: "周六" },
  { id: "2-years", label: "2 周岁", date: "2028-08-12", weekday: "周六" },
  { id: "2.5-years", label: "2.5 周岁", date: "2029-02-12", weekday: "周一" },
  { id: "3-years", label: "3 周岁", date: "2029-08-12", weekday: "周日" },
  { id: "4-years", label: "4 周岁", date: "2030-08-12", weekday: "周一" },
  { id: "5-years", label: "5 周岁", date: "2031-08-12", weekday: "周二" },
  { id: "6-years", label: "6 周岁", date: "2032-08-12", weekday: "周四" },
];
