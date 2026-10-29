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
  Sprout,
  ArrowUpRight,
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
  const syncFeedback = canEdit && cloudError ? <div className="space-y-2" role="status"><CloudError message={cloudError} /><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void retry()}>{conflict ? "重新读取并核对" : "重试同步"}</Button>{conflict?.reviewed && <><span className="self-center text-xs text-muted-foreground">云端：{String(conflict.current?.value ?? "无记录")}；本次：{conflict.mutation.action === "delete" ? "删除" : conflict.mutation.changes.weight_kg ?? conflict.mutation.changes.administered_on}</span><Button size="sm" onClick={() => resolveConflict(true)}>确认保存我的修改</Button><Button size="sm" variant="outline" onClick={() => resolveConflict(false)}>采用云端记录</Button></>}</div></div> : null;

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
      <main className="page-shell grid min-h-[65vh] place-items-center text-muted-foreground">
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
          canSignOut={Boolean(supabase && session && isOwner)}
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
        <main className="page-shell">
          <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="page-eyebrow">LITTLE STEPS, HEALTHY DAYS</p>
                <h1 className="page-heading">鱼蛋的保健档案</h1>
                <p className="page-description">体重、疫苗与儿保，一起好好照顾成长。</p>
              </div>
              <div className="flex items-center gap-3">
                {isPreview ? <PreviewBadge /> : <SyncIndicator status={syncStatus} />}
                {supabase && session && isOwner && <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut} aria-label="退出登录" title="退出登录"><LogOut className="h-4 w-4" /></Button>}
              </div>
            </header>

            {isPreview && <PreviewNotice email={session?.user.email} error={loginError} pending={loginPending} onLogin={() => void handleLogin()} />}
            {syncFeedback}

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-border bg-white p-4 sm:p-5">
              <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf0e2] text-primary"><Baby className="h-5 w-5" /></span><div><p className="text-sm font-semibold text-foreground">鱼蛋 · 男宝宝</p><p className="mt-1 text-xs text-muted-foreground">出生第 {babyAgeDays} 天</p></div></div>
              <BirthInfo />
            </div>

            <nav aria-label="保健档案分类" className="flex w-full gap-1 rounded-2xl bg-[#e9eee4] p-1.5 sm:w-fit">
              <Button type="button" variant="ghost" aria-pressed={activeView === "growth"} onClick={() => setActiveView("growth")} className={cn("h-11 flex-1 rounded-xl px-3 text-sm sm:px-6", activeView === "growth" ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground hover:bg-white/50")}><Weight className="h-4 w-4" />体重</Button>
              <Button type="button" variant="ghost" aria-pressed={activeView === "vaccines"} onClick={() => setActiveView("vaccines")} className={cn("h-11 flex-1 rounded-xl px-3 text-sm sm:px-6", activeView === "vaccines" ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground hover:bg-white/50")}><Syringe className="h-4 w-4" />疫苗</Button>
              <Button type="button" variant="ghost" aria-pressed={activeView === "care"} onClick={() => setActiveView("care")} className={cn("h-11 flex-1 rounded-xl px-3 text-sm sm:px-6", activeView === "care" ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground hover:bg-white/50")}><HeartPulse className="h-4 w-4" />卓正儿保</Button>
            </nav>

            {activeView === "vaccines" ? (
              <div className="space-y-5">
                <section className="grid grid-cols-3 divide-x divide-[#dce5d4] rounded-[20px] border border-[#dce5d4] bg-[#edf2e7] py-5 sm:py-6">
                  <SimpleMetric label="已完成" value={`${doneVaccines} 项`} />
                  <SimpleMetric label="免费计划" value={`${doneFreeVaccines}/${freeVaccines.length}`} />
                  <SimpleMetric label="临近或逾期" value={`${dueVaccines.length} 项`} />
                </section>

                <section className="overflow-hidden rounded-[22px] border border-border bg-white">
                  <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div><h2 className="section-title">接种计划</h2><p className="mt-1 text-xs text-muted-foreground">{canEdit ? "按建议接种日期排序，点击“登记”填写实际日期" : "示例项目按建议接种日期排序，登录后显示真实记录"}</p></div>
                    <div className="grid grid-cols-3 rounded-xl bg-[#edf1e8] p-1">
                      {(["all", "free", "paid"] as VaccineFilter[]).map((filter) => <Button key={filter} type="button" variant="ghost" size="sm" onClick={() => setVaccineFilter(filter)} aria-pressed={vaccineFilter === filter} className={cn("h-8 rounded-lg px-3 text-xs", vaccineFilter === filter ? "bg-white text-primary shadow-sm hover:bg-white" : "text-muted-foreground")}>{filter === "all" ? "全部" : filter === "free" ? "免费" : "自费"}</Button>)}
                    </div>
                  </div>
                  <div className="border-b border-[#eee5d6] bg-[#fbf6ed] px-5 py-3.5 text-xs leading-6 text-[#8a704a] sm:px-6"><div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>五联、四联属于替代方案，不是额外加打；具体品牌、程序和补种安排请由接种门诊确认。</p></div></div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f7f9f4] text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">疫苗</th><th className="w-44 px-4 py-3 font-medium">建议日期</th><th className="w-44 px-4 py-3 font-medium">实际日期</th><th className="w-28 px-5 py-3 text-right font-medium">操作</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {filteredVaccines.map((item) => <tr key={item.id} className={cn("transition-colors hover:bg-[#f7f9f4]", item.id === nextVaccine?.id && "bg-[#f0f5e9]")}><td className="px-5 py-3"><div className="flex flex-wrap items-center gap-2">{item.doneDate && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<span className="font-medium text-foreground">{item.vaccine} {item.dose}</span><TypeBadge type={item.type} /></div><p className="mt-1 text-xs text-muted-foreground">{item.ageLabel}{item.disease ? ` · 预防${item.disease}` : ""}</p></td><td className="px-4 py-3"><p className="font-medium text-foreground">{formatDate(item.plannedDate)}</p><DueBadge item={item} today={today} /></td><td className="px-4 py-3 text-muted-foreground">{item.doneDate ? formatDate(item.doneDate) : "尚未登记"}</td><td className="px-5 py-3 text-right">{canEdit ? <Button size="sm" variant={item.doneDate ? "outline" : "default"} onClick={() => openVaccineRecorder(item)}><CalendarCheck className="h-4 w-4" />{item.doneDate ? "修改" : "登记"}</Button> : <Button size="sm" variant="outline" onClick={() => void handleLogin()}><CircleUserRound className="h-4 w-4" />登录</Button>}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-border md:hidden">
                    {filteredVaccines.map((item) => <article key={item.id} className={cn("p-5", item.id === nextVaccine?.id && "bg-[#f0f5e9]")}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{item.doneDate && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}<h3 className="font-semibold text-foreground">{item.vaccine} {item.dose}</h3><TypeBadge type={item.type} /></div><p className="mt-1 text-xs text-muted-foreground">{item.ageLabel}</p>{item.disease && <p className="mt-1 text-xs text-muted-foreground">预防：{item.disease}</p>}</div>{canEdit ? <Button size="sm" variant={item.doneDate ? "outline" : "default"} onClick={() => openVaccineRecorder(item)}>{item.doneDate ? "修改" : "登记"}</Button> : <Button size="sm" variant="outline" onClick={() => void handleLogin()}>登录</Button>}</div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">建议日期</p><p className="mt-1 font-medium text-foreground">{formatDate(item.plannedDate)}</p><DueBadge item={item} today={today} /></div><div><p className="text-xs text-muted-foreground">实际日期</p><p className="mt-1 font-medium text-foreground">{item.doneDate ? formatDate(item.doneDate) : "尚未登记"}</p></div></div></article>)}
                  </div>
                </section>
              </div>
            ) : activeView === "care" ? (
              <PediatricCareSchedule />
            ) : (
              <div className="space-y-5">
                <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <section className="min-w-0 rounded-[22px] border border-border bg-white p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div><h2 className="section-title">体重成长曲线</h2><p className="mt-1.5 text-xs text-muted-foreground">每一次测量，都串起成长的轨迹</p></div>
                      {canEdit ? <Button onClick={() => setWeightDialogOpen(true)}><Plus className="h-4 w-4" />记录体重</Button> : <Button variant="outline" onClick={() => void handleLogin()}><CircleUserRound className="h-4 w-4" />登录后记录</Button>}
                    </div>
                    <div className="mt-6 h-56 sm:h-72">{chartData.length ? <WeightChart data={chartData} id="healthWeight" /> : <EmptyState text="还没有体重记录" />}</div>
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />体重（kg）<span className="ml-auto">共 {sortedGrowth.length} 次测量</span></p>
                  </section>
                  <section className="rounded-[22px] border border-[#dce5d4] bg-[#edf2e7] p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#66775a]"><Weight className="h-4 w-4" />最新体重</div>
                    <p className="mt-4 text-4xl font-semibold tracking-tight text-primary">{latestGrowth ? latestGrowth.weight : '—'}<span className="ml-2 text-base font-normal text-[#66775a]">kg</span></p>
                    {weightChange !== null && <p className={cn("mt-2 text-xs font-medium", weightChange >= 0 ? "text-primary" : "text-rose-700")}>较上次 {weightChange >= 0 ? "+" : ""}{weightChange} kg</p>}
                    <p className="mt-2 text-xs text-[#66775a]">{latestGrowth ? formatDate(latestGrowth.date) : '等待第一次测量'}</p>
                    {weightAssessments.length > 0 && <WeightStandardComparison assessments={weightAssessments} compact />}
                  </section>
                </div>

                <section className="overflow-hidden rounded-[22px] border border-border bg-white">
                  <div className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-6"><h2 className="section-title">测量记录</h2><span className="text-xs text-muted-foreground">最近的记录在前</span></div>
                  {sortedGrowth.length ? <div className="divide-y divide-border">{[...sortedGrowth].reverse().map((item) => <div key={item.id} className="flex items-center gap-2.5 px-4 py-4 transition-colors hover:bg-[#f8faf5] sm:gap-4 sm:px-6"><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f4eb] text-[#7b9270] sm:flex"><Weight className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{formatDate(item.date)}</p><p className="mt-1 text-xs text-muted-foreground">出生第 {Math.max(0, daysBetween(data.birthday, item.date))} 天</p></div><p className="text-xl font-semibold tracking-tight text-primary">{item.weight}<span className="ml-1.5 text-xs font-normal text-muted-foreground">kg</span></p>{canEdit && <IconButton label="删除体重记录" onClick={() => removeEntry("growth", item.id)} />}</div>)}</div> : <div className="p-5"><EmptyState text="还没有体重记录，从第一次测量开始吧" compact /></div>}
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
  canSignOut: boolean;
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
  isPreview, previewEmail, previewError, loginPending, onLogin, syncStatus, canSignOut, syncFeedback, onSignOut,
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
    <main className="page-shell space-y-4 sm:space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow hidden sm:block">GROWING TOGETHER</p>
          <h1 className="page-heading">鱼蛋的成长日常</h1>
          <p className="page-description hidden sm:block">把每一个小变化，好好收在这里。</p>
        </div>
        <div className={cn("items-center gap-3", isPreview ? "hidden sm:flex" : "flex")}>
          {isPreview ? <PreviewBadge /> : <SyncIndicator status={syncStatus} />}
          {canSignOut && <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" onClick={onSignOut} aria-label="退出登录" title="退出登录"><LogOut className="h-4 w-4" /></Button>}
        </div>
      </header>

      {isPreview && <PreviewNotice email={previewEmail} error={previewError} pending={loginPending} onLogin={onLogin} compactOnMobile />}
      {syncFeedback}

      <section className="relative overflow-hidden rounded-2xl bg-[#e9efdf] px-3 py-3 sm:rounded-[24px] sm:px-8 sm:py-8">
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[1fr_auto] sm:gap-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-6">
            <div className="relative shrink-0">
              <img src="/apple-home-logo.png" alt="鱼蛋" width="80" height="80" className="h-10 w-10 rounded-full border-2 border-white/80 object-cover sm:h-20 sm:w-20 sm:border-4" />
              <span className="absolute -bottom-1 -right-1 hidden h-7 w-7 place-items-center rounded-full bg-white text-primary sm:grid"><Sprout className="h-4 w-4" /></span>
            </div>
            <div className="min-w-0">
              <p className="hidden text-xs font-medium tracking-wider text-[#66775a] sm:block">HELLO, LITTLE ONE</p>
              <h2 className="text-sm font-semibold leading-snug text-[#2d4836] sm:mt-2 sm:text-3xl"><span className="sm:hidden">鱼蛋，今天也在长大</span><span className="hidden sm:inline">慢慢长大，每天都可爱。</span></h2>
              <p className="mt-1 text-[10px] text-[#66775a] sm:mt-2 sm:text-sm"><span className="sm:hidden">{formatDate(birthday)} 出生</span><span className="hidden sm:inline">从 {formatDate(birthday)} 开始，一起认识这个世界。</span></p>
            </div>
          </div>
          <div className="border-l border-[#cbd8bf] pl-3 text-center sm:pl-8">
            <p className="text-[10px] text-[#66775a] sm:text-xs">来到世界</p>
            <p className="mt-0.5 text-2xl font-semibold leading-tight tracking-tight text-[#315b46] sm:mt-2 sm:text-5xl">{babyAgeDays}<span className="ml-1 text-xs font-normal sm:ml-2 sm:text-sm">天</span></p>
          </div>
        </div>
      </section>

      <section aria-label="今日重点" className="space-y-3 sm:hidden">
        <a href="/health?tab=weight" className="block rounded-[18px] bg-[#315b46] px-4 py-4 text-white transition-colors hover:bg-[#294e3c]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><span className="flex items-center gap-1.5 text-xs text-[#d7e6d9]"><Weight className="h-3.5 w-3.5" />最新体重</span><p className="mt-2 text-[11px] text-[#c6d9ca]">{latestGrowth ? `${formatDate(latestGrowth.date)} 测量` : '等待第一次测量'}</p></div>
            <p className="shrink-0 text-[34px] font-semibold leading-none tracking-tight">{latestGrowth ? latestGrowth.weight : '—'}<span className="ml-1.5 text-sm font-normal text-[#d7e6d9]">kg</span></p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-2.5 text-[11px] text-[#d7e6d9]"><span>{weightChange !== null ? `较上次 ${weightChange >= 0 ? '+' : ''}${weightChange} kg` : '记录第一次体重，开启成长曲线'}</span><span className="inline-flex shrink-0 items-center gap-1">查看档案<ArrowRight className="h-3 w-3" /></span></div>
        </a>

        <aside className="overflow-hidden rounded-[18px] border border-[#e8decb] bg-[#f8f1e6]">
          <a href={nextAction.href} className="block px-4 py-3.5 text-[#4d4335] transition-colors hover:bg-[#f2e8d9]">
            <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-1.5 text-xs font-medium text-[#8a704a]"><Bell className="h-3.5 w-3.5" />接下来，要记得</h2><span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-[#916d43]">{actionDayLabel}</span></div>
            <div className="mt-2.5 flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="text-base font-semibold leading-snug">{nextAction.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#8a7c67]">{nextAction.detail}</p></div><ArrowUpRight className="h-4 w-4 shrink-0 text-[#916d43]" /></div>
          </a>
          <details className="group border-t border-[#e8decb] px-4 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] text-[#8a704a] [&::-webkit-details-marker]:hidden">查看全部近期事项<ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" /></summary>
            <p className="mt-2 text-xs leading-6 text-[#8a7c67]">{dueVaccineCount ? `还有 ${dueVaccineCount} 项接种临近或已过建议日期，可到保健档案逐项核对。` : '日子慢慢过，成长的每一件小事，我们一起记得。'}</p>
            {nextCareMilestone && nextVaccine && <a href={nextAction.type === 'care' ? '/health?tab=vaccine' : '/health?tab=care'} className="mt-2 flex items-start gap-2 rounded-lg bg-white/60 p-3 text-[#725c3d]"><CalendarCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-medium">{nextAction.type === 'care' ? `${nextVaccine.vaccine} ${nextVaccine.dose}` : `${nextCareMilestone.label}儿保`}</p><p className="mt-1 text-[11px] text-[#8a7c67]">{formatDate(nextAction.type === 'care' ? nextVaccine.plannedDate : nextCareMilestone.date)}</p></div><ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0" /></a>}
          </details>
        </aside>
      </section>

      <section aria-label="成长摘要" className="grid grid-cols-2 gap-3 sm:hidden">
        <a href="/health?tab=vaccine" className="min-w-0 rounded-2xl border border-border bg-white p-3.5 transition-colors hover:border-[#a7bca5]"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" />疫苗接种</span><p className="mt-2.5 text-2xl font-semibold leading-none text-foreground">{doneVaccines}<span className="ml-1 text-xs font-normal text-muted-foreground">/ {totalVaccines} 项</span></p><div className="mt-3 h-1 overflow-hidden rounded-full bg-[#edf1e8]"><div className="h-full rounded-full bg-[#93ae79]" style={{ width: `${vaccineProgress}%` }} /></div><p className="mt-2 text-[10px] text-muted-foreground">已完成 {vaccineProgress}%</p></a>
        <a href="/health?tab=care" className="min-w-0 rounded-2xl border border-border bg-white p-3.5 transition-colors hover:border-[#a7bca5]"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><HeartPulse className="h-3.5 w-3.5 text-[#a87c4e]" />下次儿保</span><p className="mt-2.5 text-xl font-semibold leading-tight text-foreground">{nextCareMilestone?.label || '待安排'}</p><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{nextCareMilestone ? formatDate(nextCareMilestone.date) : '暂无近期安排'}</p>{nextCareMilestone && <p className="text-[10px] text-muted-foreground">{careDays === 0 ? '今天' : `${careDays} 天后`}</p>}</a>
      </section>

      <section aria-label="成长摘要" className="hidden gap-4 sm:grid md:grid-cols-3">
        <a href="/health?tab=weight" className="group rounded-[20px] bg-[#315b46] p-5 text-white transition-colors hover:bg-[#294e3c] sm:p-6">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-[#d7e6d9]"><Weight className="h-4 w-4" />最新体重</span><ArrowUpRight className="h-4 w-4 text-[#b9cfbc] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1"><p className="text-[36px] font-semibold leading-none tracking-tight">{latestGrowth ? latestGrowth.weight : '—'}<span className="ml-2 text-base font-normal text-[#d7e6d9]">kg</span></p>{weightChange !== null && <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-[#e2eedf]">较上次 {weightChange >= 0 ? '+' : ''}{weightChange} kg</span>}</div>
          <p className="mt-4 text-xs text-[#c6d9ca]">{latestGrowth ? `${formatDate(latestGrowth.date)} 测量` : '记录第一次体重，开启成长曲线'}</p>
        </a>
        <a href="/health?tab=vaccine" className="group rounded-[20px] border border-border bg-white p-5 transition-colors hover:border-[#a7bca5] sm:p-6">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />疫苗接种</span><ArrowUpRight className="h-4 w-4 text-[#9ba89d] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1"><p className="text-[36px] font-semibold leading-none tracking-tight text-foreground">{doneVaccines}<span className="ml-2 text-base font-normal text-muted-foreground">/ {totalVaccines} 项</span></p><span className="ml-auto text-xs font-medium text-primary">{vaccineProgress}%</span></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf1e8]"><div className="h-full rounded-full bg-[#93ae79]" style={{ width: `${vaccineProgress}%` }} /></div>
        </a>
        <a href="/health?tab=care" className="group rounded-[20px] border border-border bg-white p-5 transition-colors hover:border-[#a7bca5] sm:p-6">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground"><HeartPulse className="h-4 w-4 text-[#a87c4e]" />下次儿保</span><ArrowUpRight className="h-4 w-4 text-[#9ba89d] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
          <p className="mt-5 text-[30px] font-semibold leading-tight tracking-tight text-foreground">{nextCareMilestone?.label || '待安排'}</p>
          <p className="mt-5 text-xs text-muted-foreground">{nextCareMilestone ? `${formatDate(nextCareMilestone.date)} · ${careDays === 0 ? '今天' : `${careDays} 天后`}` : '暂无近期安排'}</p>
        </a>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-[22px] border border-border bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="section-title">一点一滴，长大的轨迹</h2><p className="mt-1.5 text-xs text-muted-foreground">体重成长曲线 · 点按数据点查看测量详情</p></div>
            <a href="/health?tab=weight" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">完整档案 <ArrowRight className="h-3.5 w-3.5" /></a>
          </div>
          <div className="mt-6 h-52 sm:h-64">{chartData.length ? <WeightChart data={chartData} id="dashboardWeight" /> : <EmptyState text="记录第一次体重后，这里会出现成长曲线" />}</div>
          {weightAssessments.length > 0 && <WeightStandardComparison assessments={weightAssessments} />}
        </section>

        <aside className="hidden overflow-hidden rounded-[22px] border border-[#e8decb] bg-[#f8f1e6] sm:block">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between"><h2 className="section-title">接下来，要记得</h2><Bell className="h-4 w-4 text-[#a78456]" /></div>
            <div className="mt-6 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#a87c4e]" /><span className="text-xs font-medium text-[#916d43]">{actionDayLabel}</span></div>
            <h3 className="mt-3 text-xl font-semibold leading-relaxed text-[#4d4335]">{nextAction.title}</h3>
            <p className="mt-2 text-xs leading-6 text-[#8a7c67]">{nextAction.detail}</p>
            <a href={nextAction.href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#725c3d] transition-colors hover:bg-[#f1e4ce]">{nextAction.action}<ArrowRight className="h-3.5 w-3.5" /></a>
          </div>
          <div className="border-t border-[#e8decb] px-5 py-4 sm:px-6">
            <p className="text-xs leading-6 text-[#8a7c67]">{dueVaccineCount ? `还有 ${dueVaccineCount} 项接种临近或已过建议日期，可到保健档案逐项核对。` : '日子慢慢过，成长的每一件小事，我们一起记得。'}</p>
          </div>
          {nextCareMilestone && nextVaccine && <a href={nextAction.type === 'care' ? '/health?tab=vaccine' : '/health?tab=care'} className="flex items-start gap-3 border-t border-[#e8decb] px-5 py-4 text-[#725c3d] transition-colors hover:bg-white/40 sm:px-6"><CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{nextAction.type === 'care' ? `${nextVaccine.vaccine} ${nextVaccine.dose}` : `${nextCareMilestone.label}儿保`}</p><p className="mt-1 text-xs text-[#8a7c67]">{formatDate(nextAction.type === 'care' ? nextVaccine.plannedDate : nextCareMilestone.date)}</p></div><ChevronRight className="mt-1 h-4 w-4 shrink-0" /></a>}
        </aside>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3"><h2 className="section-title">生活的其他小事</h2><span className="h-px flex-1 bg-border" /></div>
        <div className="grid gap-3 sm:grid-cols-3"><QuickLink href="/health?tab=care" icon={HeartPulse} label="保健档案" detail="安心陪伴，健康长大" /><QuickLink href="/ledger" icon={ClipboardList} label="家庭账本" detail="把每一份花费记清楚" /><QuickLink href="/blog" icon={NotebookPen} label="成长日志" detail="收藏值得记住的日子" /></div>
      </section>
    </main>
  );
}

function PediatricCareSchedule() {
  const today = useShanghaiToday();
  const upcomingId = ZHENGZHENG_CARE_MILESTONES.find((item) => item.date >= today)?.id;
  return (
    <section className="overflow-hidden rounded-[22px] border border-border bg-white">
      <div className="flex items-start gap-4 border-b border-border px-5 py-6 sm:px-6">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#edf2e7] text-primary"><HeartPulse className="h-5 w-5" /></span>
        <div><h2 className="section-title">卓正儿童保健时间</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">从两周龄到六周岁，每个阶段都认真照顾。按鱼蛋 2026 年 8 月 12 日出生计算，具体预约以卓正门诊安排为准。</p></div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3">
        {ZHENGZHENG_CARE_MILESTONES.map((item, index) => {
          const upcoming = item.id === upcomingId;
          const past = item.date < today;
          return <article key={item.id} className={cn("flex gap-4 border-b border-border px-5 py-6 sm:px-6", upcoming && "bg-[#edf2e7]")}>
            <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-medium", upcoming ? "bg-primary text-white" : "bg-[#f2f4ee] text-[#85917b]")}>{String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-foreground">{item.label}</h3>{upcoming && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-primary">{item.date === today ? '今天' : '下次儿保'}</span>}</div><p className={cn("mt-2 text-sm font-medium", upcoming ? "text-primary" : "text-muted-foreground")}>{formatDate(item.date)}</p><p className="mt-1 text-xs text-muted-foreground">{item.weekday}{past ? ' · 已过计划日期' : ''}</p></div>
          </article>;
        })}
      </div>
    </section>
  );
}

function BirthInfo() {
  return (
    <div className="flex min-w-0 items-center gap-3 border-l border-border pl-4 sm:pl-6">
      <div><p className="text-[11px] text-muted-foreground">出生日期</p><p className="mt-1 text-sm font-medium text-foreground">2026 年 8 月 12 日</p></div>
    </div>
  );
}

function PreviewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5decd] bg-[#f6f1e6] px-3 py-1.5 text-xs font-medium text-[#88734e]">
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
  compactOnMobile = false,
}: {
  email?: string;
  error: string;
  pending: boolean;
  onLogin: () => void;
  compactOnMobile?: boolean;
}) {
  const wrongAccount = Boolean(email);
  return (
    <>
    {compactOnMobile && <section className="rounded-2xl border border-[#dce5d4] bg-[#f0f4ea] px-3 py-2.5 sm:hidden">
      <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1.5 text-[11px] font-medium leading-5 text-primary"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />示例数据，真实记录未公开</p><Button className="h-8 shrink-0 px-2.5 text-[11px]" size="sm" type="button" disabled={pending} onClick={onLogin} aria-label={wrongAccount ? '切换 GitHub 账号' : 'GitHub 登录'}>{pending && <LoaderCircle className="h-3 w-3 animate-spin" />}{wrongAccount ? '切换账号' : 'GitHub 登录'}</Button></div>
      <details className="group mt-1"><summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[10px] leading-5 text-muted-foreground [&::-webkit-details-marker]:hidden">{wrongAccount ? '当前账号没有查看权限 · 查看说明' : '查看示例与登录说明'}<ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" /></summary><p className="mt-2 text-xs leading-5 text-primary">当前体重和接种内容为示例，鱼蛋的云端记录没有公开</p><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{wrongAccount ? `当前账号 ${email} 没有查看权限，请切换到授权账号。` : `使用 ${OWNER_EMAIL} 对应的 GitHub 账号登录后，可查看和修改云端记录。`}</p></details>
      {error && <p role="status" className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </section>}
    <section className={cn("flex-col gap-3 rounded-2xl border border-[#dce5d4] bg-[#f0f4ea] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5", compactOnMobile ? "hidden sm:flex" : "flex")}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-primary"><ShieldCheck className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">当前体重和接种内容为示例，鱼蛋的云端记录没有公开</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground break-words">{wrongAccount ? `当前账号 ${email} 没有查看权限，请切换到授权账号。` : `使用 ${OWNER_EMAIL} 对应的 GitHub 账号登录后，可查看和修改云端记录。`}</p>
          {error && <p className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
        </div>
      </div>
      <Button className="shrink-0 self-start sm:self-center" size="sm" type="button" disabled={pending} onClick={onLogin}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleUserRound className="h-4 w-4" />}
        {wrongAccount ? "切换 GitHub 账号" : "GitHub 登录"}
      </Button>
    </section>
    </>
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
      "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium",
      status === "error" ? "text-rose-700" : status === "saved" ? "text-emerald-700" : "text-muted-foreground"
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
    <div className={cn("mt-5 border-t border-border pt-4", compact && "mt-5")}>
      <div className={cn("grid", compact ? "divide-y divide-[#dce5d4]" : "gap-y-4 pb-3 sm:grid-cols-2 sm:divide-x sm:divide-border")}>
        {assessments.map((assessment, index) => (
          <div key={assessment.source} className={cn("min-w-0", compact ? "py-3 first:pt-0 last:pb-0" : "px-1 sm:px-4", !compact && index === 0 && "sm:pl-0")}>
            <div className="flex items-center justify-between gap-3">
              <a className="truncate text-xs font-semibold text-foreground hover:text-primary" href={assessment.sourceUrl} target="_blank" rel="noreferrer" title="查看官方标准">
                {assessment.sourceLabel}
              </a>
              <span className="shrink-0 text-[11px] text-stone-400">{assessment.ageLabel}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-xl font-semibold text-foreground">{assessment.percentileLabel}</p>
              <p className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", assessment.position.includes("低于") || assessment.position === "下" ? "bg-rose-50 text-rose-700" : assessment.position.includes("高于") || assessment.position === "上" ? "bg-amber-50 text-amber-700" : "bg-[#eaf0e2] text-primary")}>{assessment.position}</p>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">参考范围 {assessment.low.toFixed(1)}–{assessment.high.toFixed(1)} kg · 中位 {assessment.median.toFixed(1)} kg</p>
          </div>
        ))}
      </div>
      <p className={cn("text-[11px] leading-5 text-muted-foreground", compact && "pt-3")}>男宝宝年龄别体重用于观察位置与趋势；单次结果需结合身长、喂养和儿保评估。</p>
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
    <a href={href} className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-4 transition-colors hover:border-[#a7bca5] hover:bg-[#f9fbf6]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef1e8] text-[#49613d]"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{label}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
      <ChevronRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </a>
  );
}

function TypeBadge({ type }: { type: VaccineType }) {
  return (
    <Badge variant="outline" className={cn("rounded-full text-[10px] font-medium", type === "free" ? "border-[#dce5d4] bg-[#edf2e7] text-primary" : "border-[#e8decb] bg-[#faf3e8] text-[#947247]")}>
      {type === "free" ? "中国免费" : "自费补充"}
    </Badge>
  );
}

function SimpleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2 text-center sm:px-5 sm:text-left">
      <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-primary sm:text-3xl">{value}</p>
    </div>
  );
}

function DueBadge({ item, today }: { item: VaccineEntry; today: string }) {
  const state = getDueState(item, today);
  const diff = daysBetween(today, item.plannedDate);
  if (state === "done") return <span className="mt-1 inline-flex text-xs text-emerald-700">已完成</span>;
  if (state === "overdue") return <span className="mt-1 inline-flex text-xs font-medium text-rose-700">逾期 {Math.abs(diff)} 天</span>;
  if (state === "soon") return <span className="mt-1 inline-flex text-xs font-medium text-amber-700">{diff === 0 ? "今天到期" : `${diff} 天后到期`}</span>;
  return <span className="mt-1 inline-flex text-xs text-muted-foreground">{diff} 天后</span>;
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 shrink-0 text-[#8c9989] hover:bg-rose-50 hover:text-rose-600"
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
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d5dfcd] bg-[#f7f9f4] text-center text-sm text-muted-foreground", compact ? "min-h-24 p-4" : "min-h-52 p-6")}>
      <Sprout className="h-7 w-7 text-[#8ca07c]" />
      {text}
    </div>
  );
}
