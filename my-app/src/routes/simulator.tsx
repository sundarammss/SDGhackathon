import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useStudents, useWhatIfMutation } from "../lib/hooks";
import type { WhatIfRequest, WhatIfResponse, StudentOut } from "../lib/api";
import {
  FlaskConical,
  TrendingDown,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/simulator")({ component: Simulator });

/* ── Slider Component ─────────────────────────────────────────────── */

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--sea-ink)]">
          {label}
        </label>
        <span className="rounded-lg bg-[var(--island-bg)] px-2 py-0.5 text-xs font-bold text-[var(--sea-ink)]">
          {value > 0 ? "+" : ""}
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-[#4fb8b2] dark:bg-gray-700"
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-[var(--sea-ink-soft)]">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

/* ── What-If Simulator Page ───────────────────────────────────────── */

function Simulator() {
  const { data: students, isLoading: studentsLoading } = useStudents();
  const mutation = useWhatIfMutation();

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );
  const [params, setParams] = useState<WhatIfRequest>({
    attendance_change_pct: 0,
    study_hours_change: 0,
    assignment_completion_change_pct: 0,
    forum_participation_change: 0,
  });

  const result: WhatIfResponse | undefined = mutation.data;

  const updateParam = useCallback(
    <K extends keyof WhatIfRequest>(key: K, value: WhatIfRequest[K]) => {
      setParams((p) => ({ ...p, [key]: value }));
    },
    []
  );

  const runSimulation = () => {
    if (selectedStudentId === null) return;
    mutation.mutate({ studentId: selectedStudentId, payload: params });
  };

  const studentList = students ?? [];

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      {/* Header */}
      <section className="mb-8">
        <p className="island-kicker mb-1">AI-OS</p>
        <h1 className="display-title flex items-center gap-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          <FlaskConical className="h-8 w-8 text-[#4fb8b2]" />
          What-If Trajectory Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--sea-ink-soft)]">
          Test counterfactual scenarios — see how changes in your behaviour
          could shift your predicted grade and risk profile.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Controls */}
        <section className="island-shell rounded-2xl p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
            Scenario Parameters
          </h2>

          {/* Student selector */}
          <div className="relative mb-6">
            <label className="mb-1 block text-sm font-medium text-[var(--sea-ink)]">
              Select Student
            </label>
            <div className="relative">
              <select
                value={selectedStudentId ?? ""}
                onChange={(e) =>
                  setSelectedStudentId(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-full appearance-none rounded-xl border border-[var(--line)] bg-[var(--island-bg)] py-2.5 pl-4 pr-10 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              >
                <option value="">
                  {studentsLoading ? "Loading…" : "Choose a student"}
                </option>
                {studentList.map((s: StudentOut) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.department ?? "N/A"})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-5">
            <ParamSlider
              label="Attendance Change"
              value={params.attendance_change_pct}
              min={-30}
              max={30}
              step={5}
              unit="%"
              onChange={(v) => updateParam("attendance_change_pct", v)}
            />
            <ParamSlider
              label="Weekly Study Hours Change"
              value={params.study_hours_change}
              min={-10}
              max={10}
              step={1}
              unit="h"
              onChange={(v) => updateParam("study_hours_change", v)}
            />
            <ParamSlider
              label="Assignment Completion Change"
              value={params.assignment_completion_change_pct}
              min={-30}
              max={30}
              step={5}
              unit="%"
              onChange={(v) =>
                updateParam("assignment_completion_change_pct", v)
              }
            />
            <ParamSlider
              label="Forum Participation Change"
              value={params.forum_participation_change}
              min={-5}
              max={10}
              step={1}
              unit=" posts"
              onChange={(v) => updateParam("forum_participation_change", v)}
            />
          </div>

          {/* Run button */}
          <button
            onClick={runSimulation}
            disabled={
              selectedStudentId === null || mutation.isPending
            }
            className="mt-6 w-full rounded-xl bg-[#4fb8b2] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#3da39e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Simulating…" : "Run Simulation"}
          </button>

          {mutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              Error: {mutation.error?.message ?? "Simulation failed"}
            </p>
          )}
        </section>

        {/* Right: Results */}
        <section className="lg:col-span-3">
          {!result ? (
            <div className="island-shell flex items-center justify-center rounded-2xl p-16 text-center">
              <div>
                <FlaskConical className="mx-auto mb-3 h-12 w-12 text-[var(--sea-ink-soft)] opacity-30" />
                <p className="text-[var(--sea-ink-soft)]">
                  Adjust parameters and run a simulation to see projected
                  outcomes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <ComparisonCard
                  title="At-Risk Probability"
                  current={result.current_risk}
                  projected={result.projected_risk}
                  format={(v) => `${(v * 100).toFixed(1)}%`}
                  lowerIsBetter
                />
                <ComparisonCard
                  title="Predicted Grade"
                  current={result.current_predicted_grade}
                  projected={result.projected_predicted_grade}
                  format={(v) => v.toFixed(1)}
                  lowerIsBetter={false}
                />
              </div>

              {/* Factor Impact Chart */}
              <div className="island-shell rounded-2xl p-6">
                <h3 className="mb-4 text-base font-bold text-[var(--sea-ink)]">
                  Factor Impact on Risk
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={result.factors}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--line)"
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "var(--sea-ink-soft)", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={{ fill: "var(--sea-ink-soft)", fontSize: 12 }}
                      width={180}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--island-bg)",
                        border: "1px solid var(--line)",
                        borderRadius: "0.75rem",
                        fontSize: "0.8rem",
                      }}
                    />
                    <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                      {result.factors.map((f, i) => (
                        <Cell
                          key={i}
                          fill={f.impact < 0 ? "#4fb8b2" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ── Comparison Card ──────────────────────────────────────────────── */

function ComparisonCard({
  title,
  current,
  projected,
  format,
  lowerIsBetter,
}: {
  title: string;
  current: number;
  projected: number;
  format: (v: number) => string;
  lowerIsBetter: boolean;
}) {
  const improved = lowerIsBetter
    ? projected < current
    : projected > current;
  const delta = projected - current;

  return (
    <div className="island-shell rounded-2xl p-5">
      <p className="mb-3 text-sm font-medium text-[var(--sea-ink-soft)]">
        {title}
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-[var(--sea-ink-soft)]">Current</p>
          <p className="text-2xl font-bold text-[var(--sea-ink)]">
            {format(current)}
          </p>
        </div>
        <div className="flex flex-col items-center px-4">
          {improved ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : delta === 0 ? (
            <span className="text-[var(--sea-ink-soft)]">→</span>
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
          <span
            className={`text-xs font-semibold ${improved ? "text-emerald-600" : delta === 0 ? "text-[var(--sea-ink-soft)]" : "text-red-600"}`}
          >
            {delta > 0 ? "+" : ""}
            {format(delta)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--sea-ink-soft)]">Projected</p>
          <p
            className={`text-2xl font-bold ${improved ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--sea-ink)]"}`}
          >
            {format(projected)}
          </p>
        </div>
      </div>
    </div>
  );
}
