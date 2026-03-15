import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Clock, Trophy,
  ArrowLeft, Trash2, ChevronRight, ToggleLeft, ToggleRight,
  BookOpenCheck, Upload, FileText, CheckCircle, AlertCircle,
  Calendar, Users,
} from "lucide-react";
import { useAuthStore } from "../lib/auth";
import {
  useQuizzes, useQuiz, useCreateQuiz, useSubmitQuiz,
  useMyAttempts, useQuizAttempts, useToggleQuiz,
  useAssignments, useCreateAssignment, useDeleteAssignment,
  useSubmitAssignmentPdf, useMyAssignmentSubmission, useAssignmentSubmissions,
  useApproveSubmission, fetchSubmissionFile,
} from "../lib/hooks";
import type {
  QuizCreate, QuizQuestionCreate, QuizSubmitAnswer,
  AssignmentOut, AssignmentSubmissionOut,
} from "../lib/api";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

// ── Tab type ───────────────────────────────────────────────────────────

type Tab = "quizzes" | "assignments";

function TasksPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "advisor" || user?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("quizzes");

  // Quiz sub-views
  const [quizView, setQuizView] = useState<"list" | "take" | "create" | "results">("list");
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  // Assignment sub-views
  const [assignView, setAssignView] = useState<"list" | "create" | "submissions">("list");
  const [selectedAssignId, setSelectedAssignId] = useState<number | null>(null);

  // ── Quiz deep views ──
  if (activeTab === "quizzes") {
    if (quizView === "take" && selectedQuizId !== null) {
      return (
        <TakeQuiz
          quizId={selectedQuizId}
          onBack={() => { setQuizView("list"); setSelectedQuizId(null); }}
        />
      );
    }
    if (quizView === "create" && isTeacher) {
      return <CreateQuiz onBack={() => setQuizView("list")} />;
    }
    if (quizView === "results" && selectedQuizId !== null && isTeacher) {
      return (
        <QuizResults
          quizId={selectedQuizId}
          onBack={() => { setQuizView("list"); setSelectedQuizId(null); }}
        />
      );
    }
  }

  // ── Assignment deep views ──
  if (activeTab === "assignments" && isTeacher) {
    if (assignView === "create") {
      return <CreateAssignment onBack={() => setAssignView("list")} />;
    }
    if (assignView === "submissions" && selectedAssignId !== null) {
      return (
        <ViewSubmissions
          assignmentId={selectedAssignId}
          onBack={() => { setAssignView("list"); setSelectedAssignId(null); }}
        />
      );
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpenCheck className="h-8 w-8 text-[var(--lagoon)]" />
          <h1 className="text-3xl font-bold text-[var(--sea-ink)]">Tasks</h1>
        </div>

        {/* Context-aware action button */}
        {activeTab === "quizzes" && isTeacher && (
          <button
            onClick={() => setQuizView("create")}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" /> Create Quiz
          </button>
        )}
        {activeTab === "assignments" && isTeacher && (
          <button
            onClick={() => setAssignView("create")}
            className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create Assignment
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--line)]">
        {(["quizzes", "assignments"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold capitalize transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[var(--lagoon)] text-[var(--lagoon)]"
                : "border-transparent text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            }`}
          >
            {tab === "quizzes" ? "Quizzes" : "Assignments"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "quizzes" && (
        <>
          {!isTeacher && <MyResults />}
          <QuizList
            isTeacher={isTeacher}
            onTakeQuiz={(id) => { setSelectedQuizId(id); setQuizView("take"); }}
            onViewResults={(id) => { setSelectedQuizId(id); setQuizView("results"); }}
          />
        </>
      )}

      {activeTab === "assignments" && (
        isTeacher
          ? <TeacherAssignmentList
              onViewSubmissions={(id) => { setSelectedAssignId(id); setAssignView("submissions"); }}
            />
          : <StudentAssignmentList />
      )}
    </div>
  );
}

// ── Quiz Components (unchanged from original quizzes page) ─────────────

function QuizList({
  isTeacher, onTakeQuiz, onViewResults,
}: {
  isTeacher: boolean;
  onTakeQuiz: (id: number) => void;
  onViewResults: (id: number) => void;
}) {
  const { data: quizzes, isLoading } = useQuizzes();
  const toggleMutation = useToggleQuiz();

  if (isLoading) return <LoadingSpinner />;
  if (!quizzes?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
        <ClipboardList className="mx-auto mb-3 h-10 w-10" />
        <p>{isTeacher ? "No quizzes created yet." : "No active quizzes available."}</p>
      </div>
    );
  }

  const displayed = isTeacher ? quizzes : quizzes.filter((q) => q.is_active);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--sea-ink)]">
        {isTeacher ? "All Quizzes" : "Active Quizzes"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {displayed.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--sea-ink)]">{q.title}</h3>
                {q.description && <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{q.description}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${q.is_active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-[var(--island-bg)] text-[var(--sea-ink-soft)] border border-[var(--line)]"}`}>
                {q.is_active ? "Active" : "Closed"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--sea-ink-soft)]">
              <span>{q.question_count} questions</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.duration_minutes} min</span>
              {q.creator_name && <span>By {q.creator_name}</span>}
              {q.assigned_department && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {q.assigned_department}
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {!isTeacher && q.is_active && (
                <button
                  onClick={() => onTakeQuiz(q.id)}
                  className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                >
                  Start Quiz <ChevronRight className="h-3 w-3" />
                </button>
              )}
              {isTeacher && (
                <>
                  <button
                    onClick={() => onViewResults(q.id)}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    <Trophy className="h-3 w-3" /> Results
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(q.id)}
                    disabled={toggleMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)]"
                  >
                    {q.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                    {q.is_active ? "Close" : "Reopen"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyResults() {
  const { data: attempts, isLoading } = useMyAttempts();
  if (isLoading || !attempts?.length) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-[var(--sea-ink)]">My Quiz Results</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attempts.map((a) => (
          <div key={a.id} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-4 shadow-sm">
            <h4 className="font-medium text-[var(--sea-ink)]">{a.quiz_title}</h4>
            <div className="mt-2 flex items-center gap-2">
              <div className={`text-2xl font-bold ${(a.score ?? 0) >= 70 ? "text-green-600" : (a.score ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                {a.score?.toFixed(0)}%
              </div>
              <span className="text-xs text-[var(--sea-ink-soft)]">{a.correct_answers}/{a.total_questions} correct</span>
            </div>
            {a.completed_at && (
              <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">{new Date(a.completed_at).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TakeQuiz({ quizId, onBack }: { quizId: number; onBack: () => void }) {
  const { data: quiz, isLoading } = useQuiz(quizId);
  const submitMutation = useSubmitQuiz(quizId);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null);

  if (isLoading) return <LoadingSpinner />;
  if (!quiz) return <ErrorBox message="Quiz not found" />;

  const handleSelect = (questionId: number, optionId: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    const payload: QuizSubmitAnswer[] = Object.entries(answers).map(([qid, oid]) => ({
      question_id: Number(qid),
      selected_option_id: oid,
    }));
    submitMutation.mutate({ answers: payload }, {
      onSuccess: (data) => {
        setResult({ score: data.score ?? 0, correct: data.correct_answers, total: data.total_questions });
      },
    });
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-8 text-center shadow-sm">
          <Trophy className={`mx-auto h-16 w-16 ${result.score >= 70 ? "text-green-500" : result.score >= 40 ? "text-yellow-500" : "text-red-500"}`} />
          <h2 className="mt-4 text-3xl font-bold text-[var(--sea-ink)]">Quiz Complete!</h2>
          <div className={`mt-2 text-5xl font-extrabold ${result.score >= 70 ? "text-green-600" : result.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
            {result.score.toFixed(0)}%
          </div>
          <p className="mt-2 text-[var(--sea-ink-soft)]">
            You answered {result.correct} out of {result.total} questions correctly.
          </p>
          <button onClick={onBack} className="mt-6 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700">
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-purple-600 hover:underline dark:text-purple-400">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </button>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--sea-ink)]">{quiz.title}</h2>
        <span className="flex items-center gap-1 text-sm text-[var(--sea-ink-soft)]">
          <Clock className="h-4 w-4" /> {quiz.duration_minutes} min
        </span>
      </div>
      {quiz.description && <p className="text-sm text-[var(--sea-ink-soft)]">{quiz.description}</p>}
      <div className="space-y-5">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-sm">
            <p className="font-medium text-[var(--sea-ink)]">
              <span className="mr-2 text-purple-600 dark:text-purple-400">Q{idx + 1}.</span>
              {q.question_text}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                    answers[q.id] === opt.id
                      ? "border-purple-500 bg-purple-50 dark:border-purple-500 dark:bg-purple-950/30"
                      : "border-[var(--line)] hover:bg-[var(--island-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt.id}
                    onChange={() => handleSelect(q.id, opt.id)}
                    className="accent-purple-600"
                  />
                  <span className="text-[var(--sea-ink)]">{opt.option_text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--sea-ink-soft)]">
          {Object.keys(answers).length}/{quiz.questions.length} answered
        </span>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitMutation.isPending}
          className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>
      {submitMutation.isError && <p className="text-sm text-red-500">Failed to submit quiz.</p>}
    </div>
  );
}

function CreateQuiz({ onBack }: { onBack: () => void }) {
  const createMutation = useCreateQuiz();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [assignedDepartment, setAssignedDepartment] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionCreate[]>([
    { question_text: "", options: [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }] },
  ]);

  const updateQuestion = (qi: number, text: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, question_text: text } : q)));
  const updateOption = (qi: number, oi: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, option_text: text } : o)) } : q)
    );
  const setCorrect = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) } : q)
    );
  const addOption = (qi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i === qi ? { ...q, options: [...q.options, { option_text: "", is_correct: false }] } : q)
    );
  const removeOption = (qi: number, oi: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q)
    );
  const addQuestion = () =>
    setQuestions((prev) => [
      ...prev,
      { question_text: "", options: [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }] },
    ]);
  const removeQuestion = (qi: number) => setQuestions((prev) => prev.filter((_, i) => i !== qi));

  const isValid =
    title.trim() &&
    questions.length > 0 &&
    questions.every(
      (q) =>
        q.question_text.trim() &&
        q.options.length >= 2 &&
        q.options.every((o) => o.option_text.trim()) &&
        q.options.some((o) => o.is_correct)
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const payload: QuizCreate = {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: duration,
      assigned_department: assignedDepartment.trim() || null,
      questions,
    };
    createMutation.mutate(payload, { onSuccess: onBack });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-purple-600 hover:underline dark:text-purple-400">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </button>
      <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Create New Quiz</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5">
          <input
            type="text"
            placeholder="Quiz title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--sea-ink-soft)]">Duration (minutes):</label>
            <input
              type="number" min={1} max={180} value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-20 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-[var(--sea-ink-soft)]">Assign to Department:</label>
            <input
              type="text"
              placeholder="Leave blank for all departments"
              value={assignedDepartment}
              onChange={(e) => setAssignedDepartment(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
            />
          </div>
        </div>
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Question {qi + 1}</span>
              {questions.length > 1 && (
                <button type="button" onClick={() => removeQuestion(qi)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Enter question..."
              value={q.question_text}
              onChange={(e) => updateQuestion(qi, e.target.value)}
              className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              required
            />
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(qi, oi)}
                    className={`flex-shrink-0 rounded-full p-1 ${opt.is_correct ? "text-green-600" : "text-[var(--line)] hover:text-[var(--sea-ink-soft)]"}`}
                    title="Mark as correct"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    placeholder={`Option ${oi + 1}`}
                    value={opt.option_text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
                    required
                  />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(qi, oi)} className="text-red-400 hover:text-red-600">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addOption(qi)}
              className="mt-2 text-xs text-purple-600 hover:underline dark:text-purple-400"
            >
              + Add Option
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] py-3 text-sm text-[var(--sea-ink-soft)] hover:border-purple-400 hover:text-purple-600"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="rounded-lg px-4 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)]">Cancel</button>
          <button
            type="submit"
            disabled={!isValid || createMutation.isPending}
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Quiz"}
          </button>
        </div>
        {createMutation.isError && <p className="text-sm text-red-500">Failed to create quiz: {createMutation.error.message}</p>}
      </form>
    </div>
  );
}

function QuizResults({ quizId, onBack }: { quizId: number; onBack: () => void }) {
  const { data: attempts, isLoading } = useQuizAttempts(quizId);
  const { data: quiz } = useQuiz(quizId);
  if (isLoading) return <LoadingSpinner />;
  const avg = attempts?.length
    ? (attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length).toFixed(1)
    : "0";
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-purple-600 hover:underline dark:text-purple-400">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </button>
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Results: {quiz?.title || "Quiz"}</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Submissions" value={String(attempts?.length ?? 0)} />
        <StatCard label="Average Score" value={avg + "%"} />
        <StatCard label="Questions" value={String(quiz?.question_count ?? 0)} />
      </div>
      {!attempts?.length ? (
        <p className="py-8 text-center text-[var(--sea-ink-soft)]">No submissions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--island-bg)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Student</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Score</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Correct</th>
                <th className="px-4 py-3 font-medium text-[var(--sea-ink-soft)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-[var(--sea-ink)]">{a.student_name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(a.score ?? 0) >= 70 ? "text-green-600" : (a.score ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {a.score?.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)]">{a.correct_answers}/{a.total_questions}</td>
                  <td className="px-4 py-3 text-[var(--sea-ink-soft)]">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Assignment Components ──────────────────────────────────────────────

function TeacherAssignmentList({ onViewSubmissions }: { onViewSubmissions: (id: number) => void }) {
  const { data: assignments, isLoading } = useAssignments();
  const deleteMutation = useDeleteAssignment();

  if (isLoading) return <LoadingSpinner />;
  if (!assignments?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
        <FileText className="mx-auto mb-3 h-10 w-10" />
        <p>No assignments created yet. Click "Create Assignment" to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--sea-ink)]">Your Assignments</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {assignments.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            isTeacher
            onViewSubmissions={() => onViewSubmissions(a.id)}
            onDelete={() => deleteMutation.mutate(a.id)}
            deleteLoading={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function StudentAssignmentList() {
  const { data: assignments, isLoading } = useAssignments();

  if (isLoading) return <LoadingSpinner />;
  if (!assignments?.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--island-bg)] p-12 text-center text-[var(--sea-ink-soft)]">
        <FileText className="mx-auto mb-3 h-10 w-10" />
        <p>No assignments available for your group yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--sea-ink)]">Your Assignments</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {assignments.map((a) => (
          <StudentAssignmentCard key={a.id} assignment={a} />
        ))}
      </div>
    </div>
  );
}

function AssignmentCard({
  assignment, isTeacher, onViewSubmissions, onDelete, deleteLoading,
}: {
  assignment: AssignmentOut;
  isTeacher: boolean;
  onViewSubmissions: () => void;
  onDelete: () => void;
  deleteLoading: boolean;
}) {
  const isDue = new Date(assignment.due_date) < new Date();
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">{assignment.title}</h3>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${isDue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
          {isDue ? "Past Due" : "Open"}
        </span>
      </div>
      {assignment.description && (
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)] line-clamp-2">{assignment.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--sea-ink-soft)]">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {assignment.due_date}</span>
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{assignment.department}</span>
        <span>{assignment.batch_start_year}–{assignment.batch_end_year}</span>
        {assignment.section && <span>Sec {assignment.section}</span>}
        <span className="font-medium text-[var(--lagoon)]">{assignment.submission_count} submissions</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={onViewSubmissions}
          className="flex items-center gap-1 rounded-lg bg-[var(--lagoon)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          <FileText className="h-3 w-3" /> View Submissions
        </button>
        <button
          onClick={onDelete}
          disabled={deleteLoading}
          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function StudentAssignmentCard({ assignment }: { assignment: AssignmentOut }) {
  const submitMutation = useSubmitAssignmentPdf(assignment.id);
  const { data: submission, isLoading: subLoading } = useMyAssignmentSubmission(assignment.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const isDue = new Date(assignment.due_date) < new Date();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const fd = new FormData();
    fd.append("pdf", file);
    submitMutation.mutate(fd, {
      onError: (err) => setUploadError(err.message || "Upload failed"),
    });
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-[var(--sea-ink)]">{assignment.title}</h3>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${isDue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
          {isDue ? "Past Due" : "Open"}
        </span>
      </div>
      {assignment.description && (
        <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">{assignment.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--sea-ink-soft)]">
        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {assignment.due_date}</span>
        {assignment.creator_name && <span>Set by {assignment.creator_name}</span>}
      </div>

      {/* Submission status */}
      <div className="mt-3">
        {subLoading ? (
          <span className="text-xs text-[var(--sea-ink-soft)]">Checking submission…</span>
        ) : submission ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm dark:bg-green-950/30">
            <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span className="text-green-700 dark:text-green-300">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
              {submission.is_approved && " · Approved"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span className="text-amber-700 dark:text-amber-300">Not submitted yet</span>
          </div>
        )}
      </div>

      {/* Upload button (only if not yet submitted and not past due, or still let them submit late) */}
      {!submission && (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {submitMutation.isPending ? "Uploading…" : "Upload PDF"}
          </button>
          {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
        </div>
      )}
    </div>
  );
}

// ── Create Assignment form (teacher) ───────────────────────────────────

function CreateAssignment({ onBack }: { onBack: () => void }) {
  const createMutation = useCreateAssignment();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [department, setDepartment] = useState("");
  const [batchStart, setBatchStart] = useState("");
  const [batchEnd, setBatchEnd] = useState("");
  const [section, setSection] = useState("");

  const isValid = title.trim() && dueDate && department.trim() && batchStart && batchEnd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const fd = new FormData();
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("due_date", dueDate);
    fd.append("department", department.trim());
    fd.append("batch_start_year", batchStart);
    fd.append("batch_end_year", batchEnd);
    fd.append("section", section.trim());
    createMutation.mutate(fd, { onSuccess: onBack });
  };

  const inputCls = "w-full rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--lagoon)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </button>
      <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Create New Assignment</h2>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-6">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment title" className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Assignment instructions (optional)" className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Due Date *</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Department *</label>
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch Start Year *</label>
            <input type="number" value={batchStart} onChange={(e) => setBatchStart(e.target.value)} placeholder="e.g. 2022" className={inputCls} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Batch End Year *</label>
            <input type="number" value={batchEnd} onChange={(e) => setBatchEnd(e.target.value)} placeholder="e.g. 2026" className={inputCls} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">Section (leave blank for all)</label>
          <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. A" className={inputCls} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onBack} className="rounded-lg px-4 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--island-bg)]">Cancel</button>
          <button
            type="submit"
            disabled={!isValid || createMutation.isPending}
            className="rounded-lg bg-[var(--lagoon)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating…" : "Create Assignment"}
          </button>
        </div>
        {createMutation.isError && <p className="text-sm text-red-500">Failed to create: {createMutation.error.message}</p>}
      </form>
    </div>
  );
}

// ── View Submissions (teacher) ─────────────────────────────────────────

function ViewSubmissions({ assignmentId, onBack }: { assignmentId: number; onBack: () => void }) {
  const { data: submissions, isLoading } = useAssignmentSubmissions(assignmentId);
  const { data: assignments } = useAssignments();
  const approveMutation = useApproveSubmission();
  const [marksInput, setMarksInput] = useState<Record<number, string>>({});
  const [openingId, setOpeningId] = useState<number | null>(null);

  const assignment = assignments?.find((a) => a.id === assignmentId);

  const handleOpenPdf = async (subId: number) => {
    setOpeningId(subId);
    try {
      const blob = await fetchSubmissionFile(subId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("Failed to open PDF");
    } finally {
      setOpeningId(null);
    }
  };

  const handleApprove = (subId: number) => {
    const raw = marksInput[subId] ?? "";
    const marks = raw.trim() ? parseFloat(raw) : null;
    approveMutation.mutate({ submissionId: subId, marks });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--lagoon)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </button>

      <div>
        <h2 className="text-2xl font-bold text-[var(--sea-ink)]">
          Submissions: {assignment?.title || "Assignment"}
        </h2>
        {assignment && (
          <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">Due {assignment.due_date} · {assignment.department}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Submissions" value={String(submissions?.length ?? 0)} />
        <StatCard label="Approved" value={String(submissions?.filter((s) => s.is_approved).length ?? 0)} />
        <StatCard label="Pending" value={String(submissions?.filter((s) => !s.is_approved).length ?? 0)} />
      </div>

      {!submissions?.length ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] p-12 text-center text-[var(--sea-ink-soft)]">
          <FileText className="mx-auto mb-3 h-10 w-10" />
          <p>No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <SubmissionRow
              key={sub.id}
              sub={sub}
              marksInput={marksInput[sub.id] ?? ""}
              onMarksChange={(v) => setMarksInput((p) => ({ ...p, [sub.id]: v }))}
              onOpenPdf={() => handleOpenPdf(sub.id)}
              openingPdf={openingId === sub.id}
              onApprove={() => handleApprove(sub.id)}
              approveLoading={approveMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({
  sub, marksInput, onMarksChange, onOpenPdf, openingPdf, onApprove, approveLoading,
}: {
  sub: AssignmentSubmissionOut;
  marksInput: string;
  onMarksChange: (v: string) => void;
  onOpenPdf: () => void;
  openingPdf: boolean;
  onApprove: () => void;
  approveLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[var(--sea-ink)]">{sub.student_name ?? `Student #${sub.student_id}`}</p>
          <p className="mt-0.5 text-xs text-[var(--sea-ink-soft)]">
            Submitted {new Date(sub.submitted_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sub.is_approved ? (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle className="h-3 w-3" /> Approved
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Clock className="h-3 w-3" /> Pending
            </span>
          )}
          <button
            onClick={onOpenPdf}
            disabled={openingPdf}
            className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            <FileText className="h-3 w-3" />
            {openingPdf ? "Opening…" : "Open PDF"}
          </button>
          {!sub.is_approved && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={0.5}
                value={marksInput}
                onChange={(e) => onMarksChange(e.target.value)}
                placeholder="Marks"
                className="w-20 rounded-lg border border-[var(--line)] bg-[var(--island-bg)] px-2 py-1.5 text-xs text-[var(--sea-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(79,184,178,0.4)]"
              />
              <button
                onClick={onApprove}
                disabled={approveLoading}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-3 w-3" /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared utilities ───────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--island-bg)] p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-[var(--sea-ink)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--sea-ink-soft)]">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--lagoon)] border-t-transparent" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
        {message}
      </div>
    </div>
  );
}
