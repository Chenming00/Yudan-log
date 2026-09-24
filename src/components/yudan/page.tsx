"use client";

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  Baby,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  ClipboardList,
  CircleUserRound,
  HeartPulse,
  Info,
  LoaderCircle,
  LogOut,
  NotebookPen,
  Plus,
  ShieldCheck,
  Syringe,
  Trash2,
  Weight,
} from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { isGitHubProvider, isOwnerEmail, OWNER_EMAIL } from "@/lib/auth";
import { getMaleWeightAssessments } from "@/src/lib/growth-standards";
import type { WeightAssessment } from "@/src/lib/growth-standards";
import { ZHENGZHENG_CARE_MILESTONES } from "@/src/lib/yudan-profile";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import WeightChart from "./lazy-weight-chart";
import { useHealthSync } from "./use-health-sync";
import { useShanghaiToday } from "./use-shanghai-today";
import { daysBetween, formatDate } from "@/src/lib/health-model";
import type { GrowthEntry, VaccineEntry, VaccineType, SyncStatus, VaccineFilter, YudanDashboardProps } from "@/src/lib/health-model";
const HealthRecordDialogs = lazy(() => import("./record-dialogs"));
function getDueState(vaccine: VaccineEntry, today: string) {
  if (vaccine.doneDate) return "done";
  const diff = daysBetween(today, vaccine.plannedDate);
  return diff < 0 ? "overdue" : diff <= 14 ? "soon" : "future";
}

export default function YudanDashboard({
  supabaseUrl = "",
  supabasePublishableKey = "",
  view = "dashboard",
}: YudanDashboardProps) {
  const hasSupabase = Boolean(supabaseUrl && supabasePublishableKey);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const today = useShanghaiToday();
  const [ready, setReady] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeView, setActiveView] = useState<"vaccines" | "growth" | "care">("growth");
  const [vaccineFilter, setVaccineFilter] = useState<VaccineFilter>("all");
  const [recordingVaccineId, setRecordingVaccineId] = useState<string | null>(null);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const isOwner = isOwnerEmail(session?.user.email) && isGitHubProvider(session?.user.app_metadata);
  const isPreview = Boolean(hasSupabase && (!session || !isOwner));
  const { data, cloudReady, syncStatus, cloudError, conflict, submit, retry, resolveConflict } = useHealthSync(supabase, session, isOwner, hasSupabase);
  const canEdit = !hasSupabase || Boolean(session && isOwner && cloudReady);
  const syncFeedback = canEdit && cloudError ? <div className="space-y-2" role="status"><CloudError message={cloudError} /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void retry()}>{conflict ? "重新读取并核对" : "重试同步"}</Button>{conflict?.reviewed && <><span className="self-center text-xs text-stone-600">云端：{String(conflict.current?.value ?? "无记录")}；本次：{conflict.mutation.action === "delete" ? "删除" : conflict.mutation.changes.weight_kg ?? conflict.mutation.changes.administered_on}</span><Button size="sm" onClick={() => resolveConflict(true)}>确认保存我的修改</Button><Button size="sm" variant="outline" onClick={() => resolveConflict(false)}>采用云端记录</Button></>}</div></div> : null;

  useEffect(() => {
    let active = true;
    void getBrowserSupabaseClient(supabaseUrl, supabasePublishableKey).then((client) => {
      if (active) setSupabase(client);
    });
    return () => {
      active = false;
    };
  }, [supabasePublishableKey, supabaseUrl]);

  useEffect(() => {
    if (view === "health") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveView(tab === "vaccine" || tab === "vaccines" ? "vaccines" : tab === "care" ? "care" : "growth");
    }
    setReady(true);
  }, [hasSupabase, view]);

  useEffect(() => {
    if (!hasSupabase) {
      setAuthReady(true);
      return;
    }
    if (!supabase) return;

    let active = true;
    setAuthReady(false);

    void supabase.auth.getSession().then(({ data: authData, error }) => {
      if (!active) return;
      if (error) setLoginError("登录状态已过期，请重新登录。");
      setSession(authData.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthReady(true);

    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hasSupabase, supabase]);

  const sortedGrowth = useMemo(
    () => [...data.growth].sort((a, b) => a.date.localeCompare(b.date)),
    [data.growth]
  );

  const sortedVaccines = useMemo(
    () => [...data.vaccines].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate)),
    [data.vaccines]
  );

  const latestGrowth = sortedGrowth.at(-1);
  const doneVaccines = sortedVaccines.filter((item) => item.doneDate).length;
  const freeVaccines = sortedVaccines.filter((item) => item.type === "free");
  const doneFreeVaccines = freeVaccines.filter((item) => item.doneDate).length;
  const nextVaccine = sortedVaccines.find((item) => !item.doneDate);
  const babyAgeDays = Math.max(0, daysBetween(data.birthday, today));

  const dueVaccines = sortedVaccines.filter((item) => {
    if (item.doneDate) return false;
    const state = getDueState(item, today);
    return state === "soon" || state === "overdue";
  });

  const filteredVaccines = sortedVaccines.filter((item) => {
    if (vaccineFilter === "all") return true;
    return item.type === vaccineFilter;
  });

  const chartData = sortedGrowth.map((item) => ({
    date: item.date,
    weight: item.weight,
    height: item.height,
    head: item.head,
  }));

  function saveWeight(date: string, weight: number) {
    const existing = data.growth.find((item) => item.date === date);
    return submit({ request_id: crypto.randomUUID(), kind: "weight", key: date, action: "save", expected_updated_at: existing?.updatedAt ?? null, changes: { weight_kg: weight } });
  }

  function openVaccineRecorder(item: VaccineEntry) { setRecordingVaccineId(item.id); }
  function saveVaccine(item: VaccineEntry, doneDate: string) {
    return submit({ request_id: crypto.randomUUID(), kind: "vaccine", key: item.planId || item.id, action: doneDate ? "save" : "delete", expected_updated_at: item.updatedAt ?? null, changes: doneDate ? { administered_on: doneDate } : {} });
  }

  function removeEntry(_section: "growth", id: string) {
    const existing = data.growth.find((item) => item.id === id);
    if (existing) submit({ request_id: crypto.randomUUID(), kind: "weight", key: existing.date, action: "delete", expected_updated_at: existing.updatedAt ?? null, changes: {} });
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function handleLogin() {
    if (!supabase) return;
    setLoginPending(true);
    setLoginError("");

    if (session && !isOwner) {
      await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.href.split("#")[0] },
    });

    if (error) {
      setLoginPending(false);
      setLoginError(error.message);
    }
  }

  if (!ready || (authReady && supabase && session && isOwner && !cloudReady)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f8f5] text-stone-500">
        <div className="flex items-center gap-2 text-sm">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          正在读取鱼蛋的数据
        </div>
      </main>
    );
  }

  if (ready) {
    const recordingVaccine = sortedVaccines.find((item) => item.id === recordingVaccineId);
    const previousGrowth = sortedGrowth.at(-2);
    const weightChange = latestGrowth && previousGrowth
      ? Number((latestGrowth.weight - previousGrowth.weight).toFixed(2))
      : null;
    const weightAssessments = latestGrowth
      ? getMaleWeightAssessments(data.birthday, latestGrowth.date, latestGrowth.weight)
      : [];
    const nextCareMilestone = ZHENGZHENG_CARE_MILESTONES.find((item) => item.date >= today);

    if (view === "dashboard") {
      return (
        <DashboardLayout
          isPreview={isPreview}
          previewEmail={session?.user.email}
          previewError={loginError}
          loginPending={loginPending}
          onLogin={() => void handleLogin()}
          syncStatus={syncStatus}
          canEdit={canEdit}
          syncFeedback={syncFeedback}
          onSignOut={handleSignOut}
          babyAgeDays={babyAgeDays}
          birthday={data.birthday}
          latestGrowth={latestGrowth}
          weightAssessments={weightAssessments}
          nextVaccine={nextVaccine}
          nextCareMilestone={nextCareMilestone}
          doneVaccines={doneVaccines}
          totalVaccines={sortedVaccines.length}
          dueVaccineCount={dueVaccines.length}
          chartData={chartData}
          weightChange={weightChange}
        />
      );
    }

    return (
      <>
        <main className="min-h-screen overflow-x-hidden bg-[#f7f8f5] px-4 py-5 text-stone-900 sm:px-6 sm:py-7" style={{ paddingBottom: "var(--nav-height)" }}>
          <div className="mx-auto max-w-6xl space-y-5">
            <header className="grid gap-4 border-b border-stone-200 pb-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><HeartPulse className="h-4 w-4" />保健</div>
                <h1 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">体重与疫苗档案</h1>
                <p className="mt-1 text-sm leading-6 text-stone-500">{isPreview ? "预览体重趋势、同龄标准和接种记录的呈现方式。" : "记录男宝宝的体重趋势与接种日期，接种安排以门诊和接种本为准。"}</p>
              </div>
              <div className="flex items-end gap-3">
                <BirthInfo />
                <div className="mb-1 flex items-center gap-2">{isPreview ? <PreviewBadge /> : <SyncIndicator status={syncStatus} />}{supabase && session && isOwner && <Button type="button" variant="ghost" size="icon" className="text-stone-400 hover:bg-white hover:text-stone-700" onClick={handleSignOut} aria-label="退出登录" title="退出登录"><LogOut className="h-4 w-4" /></Button>}</div>
              </div>
            </header>

            {isPreview && <PreviewNotice email={session?.user.email} error={loginError} pending={loginPending} onLogin={() => void handleLogin()} />}
            {syncFeedback}

            <div className="grid grid-cols-3 rounded-lg bg-stone-200/70 p-1 sm:w-[27rem]">
              <Button type="button" variant="ghost" onClick={() => setActiveView("growth")} className={cn("h-10 rounded-md", activeView === "growth" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600")}><Weight className="h-4 w-4" />体重</Button>
              <Button type="button" variant="ghost" onClick={() => setActiveView("vaccines")} className={cn("h-10 rounded-md", activeView === "vaccines" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600")}><Syringe className="h-4 w-4" />疫苗</Button>
              <Button type="button" variant="ghost" onClick={() => setActiveView("care")} className={cn("h-10 rounded-md", activeView === "care" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600")}><HeartPulse className="h-4 w-4" />卓正儿保</Button>
            </div>

            {activeView === "vaccines" ? (
              <div className="space-y-4">
                <section className="grid grid-cols-3 divide-x divide-stone-200 rounded-lg border border-stone-200 bg-white py-3 shadow-sm sm:py-4">
                  <SimpleMetric label="已完成" value={`${doneVaccines} 项`} />
                  <SimpleMetric label="免费计划" value={`${doneFreeVaccines}/${freeVaccines.length}`} />
                  <SimpleMetric label="临近或逾期" value={`${dueVaccines.length} 项`} />
                </section>

                <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div><h2 className="font-semibold text-stone-950">接种计划</h2><p className="mt-1 text-xs text-stone-500">{canEdit ? "按建议接种日期排序，点击“登记”填写实际日期" : "示例项目按建议接种日期排序，登录后显示真实记录"}</p></div>
                    <div className="grid grid-cols-3 rounded-lg bg-stone-100 p-1">
                      {(["all", "free", "paid"] as VaccineFilter[]).map((filter) => <Button key={filter} type="button" variant="ghost" size="sm" onClick={() => setVaccineFilter(filter)} className={cn("h-8 rounded-md px-3 text-xs", vaccineFilter === filter ? "bg-white text-stone-950 shadow-sm" : "text-stone-500")}>{filter === "all" ? "全部" : filter === "free" ? "免费" : "自费"}</Button>)}
                    </div>
                  </div>
                  <div className="border-b border-sky-100 bg-sky-50/70 px-4 py-3 text-xs leading-5 text-sky-950 sm:px-5"><div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" /><p>五联、四联属于替代方案，不是额外加打；具体品牌、程序和补种安排请由接种门诊确认。</p></div></div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-50 text-xs text-stone-500"><tr><th className="px-5 py-3 font-medium">疫苗</th><th className="w-44 px-4 py-3 font-medium">建议日期</th><th className="w-44 px-4 py-3 font-medium">实际日期</th><th className="w-28 px-5 py-3 text-right font-medium">操作</th></tr></thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredVaccines.map((item) => <tr key={item.id} className={cn("hover:bg-stone-50", item.id === nextVaccine?.id && "bg-emerald-50/55")}><td className="px-5 py-3"><div className="flex flex-wrap items-center gap-2">{item.doneDate && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<span className="font-medium text-stone-950">{item.vaccine} {item.dose}</span><TypeBadge type={item.type} /></div><p className="mt-1 text-xs text-stone-500">{item.ageLabel}{item.disease ? ` · 预防${item.disease}` : ""}</p></td><td className="px-4 py-3"><p className="font-medium text-stone-700">{formatDate(item.plannedDate)}</p><DueBadge item={item} today={today} /></td><td className="px-4 py-3 text-stone-600">{item.doneDate ? formatDate(item.doneDate) : "尚未登记"}</td><td className="px-5 py-3 text-right">{canEdit ? <Button size="sm" variant={item.doneDate ? "outline" : "default"} onClick={() => openVaccineRecorder(item)}><CalendarCheck className="h-4 w-4" />{item.doneDate ? "修改" : "登记"}</Button> : <Button size="sm" variant="outline" onClick={() => void handleLogin()}><CircleUserRound className="h-4 w-4" />登录</Button>}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-stone-100 md:hidden">
                    {filteredVaccines.map((item) => <article key={item.id} className={cn("p-4", item.id === nextVaccine?.id && "bg-emerald-50/55")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{item.doneDate && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<h3 className="font-semibold text-stone-950">{item.vaccine} {item.dose}</h3><TypeBadge type={item.type} /></div><p className="mt-1 text-xs text-stone-500">{item.ageLabel}</p>{item.disease && <p className="mt-1 text-xs text-stone-500">预防：{item.disease}</p>}</div>{canEdit ? <Button size="sm" variant={item.doneDate ? "outline" : "default"} onClick={() => openVaccineRecorder(item)}>{item.doneDate ? "修改" : "登记"}</Button> : <Button size="sm" variant="outline" onClick={() => void handleLogin()}>登录</Button>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-stone-500">建议日期</p><p className="mt-1 font-medium text-stone-700">{formatDate(item.plannedDate)}</p><DueBadge item={item} today={today} /></div><div><p className="text-xs text-stone-500">实际日期</p><p className="mt-1 font-medium text-stone-700">{item.doneDate ? formatDate(item.doneDate) : "尚未登记"}</p></div></div></article>)}
                  </div>
                </section>
              </div>
            ) : activeView === "care" ? (
              <PediatricCareSchedule />
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-stone-950">体重趋势</h2><p className="mt-1 text-xs text-stone-500">按测量日期连续记录，直观看变化</p></div>{canEdit ? <Button onClick={() => setWeightDialogOpen(true)}><Plus className="h-4 w-4" />记录体重</Button> : <Button variant="outline" onClick={() => void handleLogin()}><CircleUserRound className="h-4 w-4" />登录后记录</Button>}</div>
                  <div className="mt-5 h-72">{chartData.length ? <WeightChart data={chartData} id="healthWeight" /> : <EmptyState text="还没有体重记录" compact />}</div>
                </section>
                <section className="rounded-lg border border-stone-200 bg-white shadow-sm">
                  <div className="border-b border-stone-100 px-4 py-4"><p className="text-xs text-stone-500">最新体重</p><div className="mt-1 flex items-end justify-between"><p className="text-2xl font-semibold text-stone-950">{latestGrowth ? `${latestGrowth.weight} kg` : "待记录"}</p>{weightChange !== null && <p className={cn("text-xs font-medium", weightChange >= 0 ? "text-emerald-700" : "text-rose-700")}>较上次 {weightChange >= 0 ? "+" : ""}{weightChange} kg</p>}</div>{latestGrowth && <p className="mt-1 text-xs text-stone-500">{formatDate(latestGrowth.date)} · 男宝宝</p>}</div>
                  {weightAssessments.length > 0 && <div className="border-b border-stone-100 px-4 pb-4"><WeightStandardComparison assessments={weightAssessments} compact /></div>}
                  <div className="divide-y divide-stone-100">{[...sortedGrowth].reverse().map((item) => <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm"><div><p className="font-medium text-stone-950">{item.weight} kg</p><p className="mt-0.5 text-xs text-stone-500">{formatDate(item.date)}</p></div>{canEdit && <IconButton label="删除体重记录" onClick={() => removeEntry("growth", item.id)} />}</div>)}</div>
                </section>
              </div>
            )}
          </div>
        </main>

        {canEdit && (weightDialogOpen || recordingVaccine) && <Suspense fallback={<div role="status" className="fixed bottom-24 left-4 rounded-lg bg-white p-3 shadow">正在打开记录表单…</div>}><HealthRecordDialogs userId={session?.user.id || "local"} today={today} weightOpen={weightDialogOpen} onWeightOpenChange={setWeightDialogOpen} vaccine={recordingVaccine} onVaccineClose={() => setRecordingVaccineId(null)} onSaveWeight={saveWeight} onSaveVaccine={saveVaccine} /></Suspense>}
      </>
    );
  }

}

type DashboardLayoutProps = {
  isPreview: boolean;
  previewEmail?: string;
  previewError: string;
  loginPending: boolean;
  onLogin: () => void;
  syncStatus: SyncStatus;
  canEdit: boolean;
  syncFeedback: ReactNode;
  onSignOut: () => void;
  babyAgeDays: number;
  birthday: string;
  latestGrowth?: GrowthEntry;
  weightAssessments: WeightAssessment[];
  nextVaccine?: VaccineEntry;
  nextCareMilestone?: (typeof ZHENGZHENG_CARE_MILESTONES)[number];
  doneVaccines: number;
  totalVaccines: number;
  dueVaccineCount: number;
  chartData: { date: string; weight: number; height: number; head: number }[];
  weightChange: number | null;
};

function DashboardLayout({
  isPreview, previewEmail, previewError, loginPending, onLogin, syncStatus, canEdit, syncFeedback, onSignOut,
  babyAgeDays, birthday, latestGrowth, weightAssessments, nextVaccine, nextCareMilestone,
  doneVaccines, totalVaccines, dueVaccineCount, chartData, weightChange,
}: DashboardLayoutProps) {
  const today = useShanghaiToday();
  const nextAction = nextCareMilestone && nextVaccine
    ? new Date(nextCareMilestone.date).getTime() <= new Date(nextVaccine.plannedDate).getTime()
      ? { type: "care" as const, title: `${nextCareMilestone.label}儿保`, detail: `${formatDate(nextCareMilestone.date)} · ${nextCareMilestone.weekday}`, date: nextCareMilestone.date, href: "/health?tab=care", action: "查看儿保" }
      : { type: "vaccine" as const, title: `${nextVaccine.vaccine} ${nextVaccine.dose}`, detail: `${nextVaccine.ageLabel} · ${formatDate(nextVaccine.plannedDate)}`, date: nextVaccine.plannedDate, href: "/health?tab=vaccine", action: "查看疫苗" }
    : nextCareMilestone
      ? { type: "care" as const, title: `${nextCareMilestone.label}儿保`, detail: `${formatDate(nextCareMilestone.date)} · ${nextCareMilestone.weekday}`, date: nextCareMilestone.date, href: "/health?tab=care", action: "查看儿保" }
      : nextVaccine
        ? { type: "vaccine" as const, title: `${nextVaccine.vaccine} ${nextVaccine.dose}`, detail: `${nextVaccine.ageLabel} · ${formatDate(nextVaccine.plannedDate)}`, date: nextVaccine.plannedDate, href: "/health?tab=vaccine", action: "查看疫苗" }
        : { type: "weight" as const, title: "记录一次体重", detail: "持续观察鱼蛋的成长趋势", date: today, href: "/health?tab=weight", action: "去记录" };
  const vaccineProgress = totalVaccines ? Math.round((doneVaccines / totalVaccines) * 100) : 0;
  const actionDays = daysBetween(today, nextAction.date);
  const actionDayLabel = actionDays === 0 ? "今天" : actionDays === 1 ? "明天" : actionDays > 1 ? `${actionDays} 天后` : `已过 ${Math.abs(actionDays)} 天`;
  const careDays = nextCareMilestone ? daysBetween(today, nextCareMilestone.date) : null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f5f2eb] px-4 py-4 text-stone-900 sm:px-6 sm:py-6" style={{ paddingBottom: "var(--nav-height)" }}>
      <div className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-[#dfe9d7]/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-[34rem] h-80 w-80 rounded-full bg-[#f3dfcb]/70 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <header className="flex items-center justify-between gap-4 px-1 py-1">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/apple-home-logo.png" alt="鱼蛋" className="h-11 w-11 rounded-2xl object-cover shadow-sm ring-1 ring-stone-900/5" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-[#183c2f]">鱼蛋成长看板</h1>
              <p className="mt-0.5 text-xs text-stone-500">把每一个小变化，好好收在这里</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPreview ? <PreviewBadge /> : <SyncIndicator status={syncStatus} />}
            {canEdit && <Button type="button" variant="ghost" size="icon" className="rounded-full bg-white/80 text-stone-400 shadow-sm ring-1 ring-stone-900/5 hover:text-stone-700" onClick={onSignOut} aria-label="退出登录" title="退出登录"><LogOut className="h-4 w-4" /></Button>}
          </div>
        </header>

        {isPreview && <PreviewNotice email={previewEmail} error={previewError} pending={loginPending} onLogin={onLogin} />}
        {syncFeedback}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <article className="relative min-h-[300px] overflow-hidden rounded-[28px] bg-[#183c2f] p-6 text-white shadow-[0_24px_60px_-32px_rgba(24,60,47,0.75)] sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border-[36px] border-white/5" />
            <div className="pointer-events-none absolute bottom-6 right-10 h-24 w-24 rounded-full bg-[#d6e4a9]/10" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[#e3edc8] ring-1 ring-white/10"><Baby className="h-3.5 w-3.5" />出生第 {babyAgeDays} 天</span>
                <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">今天的鱼蛋，<br className="hidden sm:block" />又长大了一点点。</h2>
                <p className="mt-3 text-sm text-white/60">出生于 {formatDate(birthday)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:max-w-lg sm:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                  <p className="text-[11px] font-medium tracking-wide text-white/55">最新体重</p>
                  <p className="mt-1 text-2xl font-semibold">{latestGrowth ? `${latestGrowth.weight} kg` : "待记录"}</p>
                </div>
                <div className="rounded-2xl bg-[#d6e4a9] px-4 py-3 text-[#183c2f]">
                  <p className="text-[11px] font-medium tracking-wide text-[#183c2f]/60">接种进度</p>
                  <p className="mt-1 text-2xl font-semibold">{doneVaccines}<span className="ml-1 text-sm font-medium opacity-60">/ {totalVaccines}</span></p>
                </div>
              </div>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-[28px] bg-[#f0cfaa] p-6 shadow-[0_18px_50px_-34px_rgba(92,58,28,0.55)] sm:p-7">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#70451f]"><Bell className="h-4 w-4" />最近要做</span>
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", actionDays <= 1 ? "bg-[#183c2f] text-white" : "bg-white/65 text-[#70451f]")}>{actionDayLabel}</span>
              </div>
              <span className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-white/65 text-[#70451f]">
                {nextAction.type === "vaccine" ? <Syringe className="h-6 w-6" /> : nextAction.type === "care" ? <HeartPulse className="h-6 w-6" /> : <Weight className="h-6 w-6" />}
              </span>
              <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-[#3f2b1a]">{nextAction.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#70451f]/75">{nextAction.detail}</p>
            </div>
            <a href={nextAction.href} className="mt-8 inline-flex h-12 items-center justify-between rounded-2xl bg-white/75 px-4 text-sm font-semibold text-[#3f2b1a] transition hover:bg-white">{nextAction.action}<span className="grid h-8 w-8 place-items-center rounded-full bg-[#3f2b1a] text-white"><ArrowRight className="h-4 w-4" /></span></a>
          </article>
        </section>

        <section aria-label="成长摘要" className="grid gap-3 sm:grid-cols-3">
          <a href="/health?tab=weight" className="group rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Weight className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-600" /></div>
            <p className="mt-5 text-xs font-medium text-stone-500">体重变化</p>
            <div className="mt-1 flex items-baseline gap-2"><p className="text-2xl font-semibold text-stone-950">{latestGrowth ? `${latestGrowth.weight} kg` : "待记录"}</p>{weightChange !== null && <span className={cn("text-xs font-semibold", weightChange >= 0 ? "text-emerald-700" : "text-rose-700")}>{weightChange >= 0 ? "+" : ""}{weightChange} kg</span>}</div>
            <p className="mt-1 text-xs text-stone-400">{latestGrowth ? `${formatDate(latestGrowth.date)} 测量` : "还没有测量记录"}</p>
          </a>
          <a href="/health?tab=care" className="group rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><HeartPulse className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-600" /></div>
            <p className="mt-5 text-xs font-medium text-stone-500">下次儿保</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{nextCareMilestone?.label || "待安排"}</p>
            <p className="mt-1 text-xs text-stone-400">{nextCareMilestone ? `${formatDate(nextCareMilestone.date)} · ${careDays === 0 ? "今天" : `${careDays} 天后`}` : "暂无近期安排"}</p>
          </a>
          <a href="/health?tab=vaccine" className="group rounded-3xl bg-white/85 p-5 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Syringe className="h-5 w-5" /></span><ChevronRight className="h-4 w-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-600" /></div>
            <p className="mt-5 text-xs font-medium text-stone-500">疫苗接种</p>
            <div className="mt-1 flex items-baseline gap-2"><p className="text-2xl font-semibold text-stone-950">{vaccineProgress}%</p><span className="text-xs text-stone-400">已完成 {doneVaccines} 项</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${vaccineProgress}%` }} /></div>
            <p className="mt-2 text-xs text-stone-400">{dueVaccineCount ? `${dueVaccineCount} 项临近或逾期` : "目前没有临近事项"}</p>
          </a>
        </section>

        <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <section className="rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-stone-900/5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Growth curve</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950">体重成长曲线</h2><p className="mt-1 text-xs text-stone-500">鼠标放在数据点上，可查看日期与体重</p></div>
              <a href="/health?tab=weight" className="inline-flex h-9 items-center gap-1 rounded-full bg-stone-100 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-200">完整档案 <ArrowRight className="h-3.5 w-3.5" /></a>
            </div>
            {weightAssessments.length > 0 && <WeightStandardComparison assessments={weightAssessments} compact />}
            <div className="mt-4 h-56 sm:h-72">{chartData.length ? <WeightChart data={chartData} id="dashboardWeight" /> : <EmptyState text="记录第一次体重后，这里会出现成长曲线" compact />}</div>
          </section>

          <aside className="rounded-[28px] bg-[#e5ebdb] p-5 shadow-sm ring-1 ring-stone-900/5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#49613d]">Coming up</p><h2 className="mt-1 text-xl font-semibold text-[#24341e]">接下来</h2></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 text-[#49613d]"><CalendarCheck className="h-5 w-5" /></span></div>
            <div className="mt-6 space-y-3">
              {nextCareMilestone && <a href="/health?tab=care" className="block rounded-2xl bg-white/70 p-4 transition hover:bg-white"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><HeartPulse className="h-4 w-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-stone-900">{nextCareMilestone.label}儿保</p><span className="rounded-full bg-[#e5ebdb] px-2 py-0.5 text-[10px] font-semibold text-[#49613d]">{careDays === 0 ? "今天" : `${careDays} 天后`}</span></div><p className="mt-1 text-xs leading-5 text-stone-500">{formatDate(nextCareMilestone.date)} · {nextCareMilestone.weekday}</p></div></div></a>}
              {nextVaccine && <a href="/health?tab=vaccine" className="block rounded-2xl bg-white/70 p-4 transition hover:bg-white"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Syringe className="h-4 w-4" /></span><div className="min-w-0"><p className="font-semibold leading-5 text-stone-900">{nextVaccine.vaccine} {nextVaccine.dose}</p><p className="mt-1 text-xs leading-5 text-stone-500">{nextVaccine.ageLabel} · {formatDate(nextVaccine.plannedDate)}</p></div></div></a>}
              {!nextCareMilestone && !nextVaccine && <div className="rounded-2xl bg-white/60 p-5 text-sm text-stone-500">近期没有需要处理的事项。</div>}
            </div>
            <a href="/health" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24341e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#182314]">打开保健档案 <ArrowRight className="h-4 w-4" /></a>
          </aside>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">More</p><h2 className="mt-1 text-lg font-semibold text-stone-900">常用入口</h2></div></div>
          <div className="grid gap-3 sm:grid-cols-3"><QuickLink href="/health?tab=care" icon={HeartPulse} label="保健档案" detail="体重、疫苗与卓正儿保" /><QuickLink href="/ledger" icon={ClipboardList} label="家庭账本" detail="收支与月度汇总" /><QuickLink href="/blog" icon={NotebookPen} label="成长日志" detail="保存值得记住的日子" /></div>
        </section>
      </div>
    </main>
  );
}

function PediatricCareSchedule() {
  const today = useShanghaiToday();
  return (
    <section className="overflow-hidden rounded-lg border border-sky-200 bg-white shadow-sm">
      <div className="border-b border-sky-100 bg-sky-50 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-sky-700"><HeartPulse className="h-4 w-4" /></span>
          <div><h2 className="font-semibold text-stone-950">卓正儿童保健时间</h2><p className="mt-1 text-xs leading-5 text-stone-600">按鱼蛋 2026 年 8 月 12 日出生计算，具体预约以卓正门诊安排为准。</p></div>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
        {ZHENGZHENG_CARE_MILESTONES.map((item) => (
          <article key={item.id} className={cn("rounded-lg border p-3", item.date === today ? "border-sky-300 bg-sky-50" : "border-stone-200 bg-white")}>
            <div className="flex items-center justify-between gap-3"><p className="font-medium text-stone-950">{item.label}</p>{item.date === today && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-medium text-white">今天</span>}</div>
            <p className="mt-2 text-sm font-semibold text-sky-700">{formatDate(item.date)}</p><p className="mt-0.5 text-xs text-stone-500">{item.weekday}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function BirthInfo() {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 border-l-2 border-emerald-200 pl-3 sm:min-w-52">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Baby className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-stone-500">出生日期</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-stone-950">2026 年 8 月 12 日</p>
        </div>
      </div>
    </div>
  );
}

function PreviewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
      <CloudOff className="h-3.5 w-3.5" />
      示例预览
    </span>
  );
}

function PreviewNotice({
  email,
  error,
  pending,
  onLogin,
}: {
  email?: string;
  error: string;
  pending: boolean;
  onLogin: () => void;
}) {
  const wrongAccount = Boolean(email);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-sky-700"><ShieldCheck className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-950">当前体重和接种内容为示例，鱼蛋的云端记录没有公开</p>
          <p className="mt-0.5 text-xs leading-5 text-sky-800">{wrongAccount ? `当前账号 ${email} 没有查看权限，请切换到授权账号。` : `使用 ${OWNER_EMAIL} 对应的 GitHub 账号登录后，可查看和修改云端记录。`}</p>
          {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
        </div>
      </div>
      <Button className="shrink-0" size="sm" type="button" disabled={pending} onClick={onLogin}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleUserRound className="h-4 w-4" />}
        {wrongAccount ? "切换 GitHub 账号" : "GitHub 登录"}
      </Button>
    </section>
  );
}

function SyncIndicator({ status }: { status: SyncStatus }) {
  const labels: Record<SyncStatus, string> = {
    local: "本机保存",
    loading: "读取中",
    saving: "保存中",
    saved: "已同步",
    error: "同步失败",
    pending: "待同步",
    conflict: "需要核对",
  };
  const isBusy = status === "loading" || status === "saving";
  const Icon = isBusy ? LoaderCircle : status === "error" || status === "local" ? CloudOff : Cloud;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-xs font-medium",
      status === "error" ? "text-rose-700" : status === "saved" ? "text-emerald-700" : "text-stone-500"
    )}>
      <Icon className={cn("h-3.5 w-3.5", isBusy && "animate-spin")} />
      {labels[status]}
    </span>
  );
}

function CloudError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function WeightStandardComparison({
  assessments,
  compact = false,
}: {
  assessments: WeightAssessment[];
  compact?: boolean;
}) {
  return (
    <div className={cn("mt-4 border-y border-stone-100", compact && "mt-3")}>
      <div className={cn("grid", compact ? "divide-y divide-stone-100" : "gap-y-3 py-3 sm:grid-cols-2 sm:divide-x sm:divide-stone-100")}>
        {assessments.map((assessment, index) => (
          <div key={assessment.source} className={cn("min-w-0", compact ? "py-3 first:pt-0 last:pb-0" : "px-1 sm:px-4", !compact && index === 0 && "sm:pl-0")}>
            <div className="flex items-center justify-between gap-3">
              <a className="truncate text-xs font-semibold text-stone-700 hover:text-sky-700" href={assessment.sourceUrl} target="_blank" rel="noreferrer" title="查看官方标准">
                {assessment.sourceLabel}
              </a>
              <span className="shrink-0 text-[11px] text-stone-400">{assessment.ageLabel}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-xl font-semibold text-stone-950">{assessment.percentileLabel}</p>
              <p className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", assessment.position.includes("低于") || assessment.position === "下" ? "bg-rose-50 text-rose-700" : assessment.position.includes("高于") || assessment.position === "上" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{assessment.position}</p>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-stone-500">参考范围 {assessment.low.toFixed(1)}–{assessment.high.toFixed(1)} kg · 中位 {assessment.median.toFixed(1)} kg</p>
          </div>
        ))}
      </div>
      <p className={cn("pb-3 text-[11px] leading-5 text-stone-500", compact && "pt-3")}>男宝宝年龄别体重用于观察位置与趋势；单次结果需结合身长、喂养和儿保评估。</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  detail: string;
}) {
  return (
    <a href={href} className="group flex items-center gap-3 rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef1e8] text-[#49613d]"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-semibold text-stone-950">{label}</p><p className="mt-0.5 truncate text-xs text-stone-500">{detail}</p></div>
      <ChevronRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600" />
    </a>
  );
}

function TypeBadge({ type }: { type: VaccineType }) {
  return (
    <Badge variant="outline" className={cn("rounded text-[11px]", type === "free" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-indigo-200 bg-indigo-50 text-indigo-700")}>
      {type === "free" ? "中国免费" : "自费补充"}
    </Badge>
  );
}

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center sm:px-5 sm:text-left">
      <p className="truncate text-[11px] text-stone-500 sm:text-xs">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-stone-950 sm:text-xl">{value}</p>
    </div>
  );
}

function DueBadge({ item, today }: { item: VaccineEntry; today: string }) {
  const state = getDueState(item, today);
  const diff = daysBetween(today, item.plannedDate);
  if (state === "done") return <span className="mt-1 inline-flex text-xs text-emerald-700">已完成</span>;
  if (state === "overdue") return <span className="mt-1 inline-flex text-xs font-medium text-rose-700">逾期 {Math.abs(diff)} 天</span>;
  if (state === "soon") return <span className="mt-1 inline-flex text-xs font-medium text-amber-700">{diff === 0 ? "今天到期" : `${diff} 天后到期`}</span>;
  return <span className="mt-1 inline-flex text-xs text-stone-500">{diff} 天后</span>;
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500", compact ? "min-h-24 p-4" : "min-h-52 p-6")}>
      {text}
    </div>
  );
}
