import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ClipboardList, Plus, CheckCircle2, XCircle, Clock, Trophy,
  ArrowLeft, Trash2, ChevronRight, ToggleLeft, ToggleRight,
} from "lucide-react";
import { useAuthStore } from "../lib/auth";
import {
  useQuizzes, useQuiz, useCreateQuiz, useSubmitQuiz,
  useMyAttempts, useQuizAttempts, useToggleQuiz,
} from "../lib/hooks";
import type {
  QuizCreate, QuizQuestionCreate, QuizSubmitAnswer,
} from "../lib/api";

export const Route = createFileRoute("/quizzes")({
  component: QuizzesPage,
});

function QuizzesPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === "advisor" || user?.role === "admin";
  const [view, setView] = useState<"list" | "take" | "create" | "results">("list");
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);

  if (view === "take" && selectedQuizId !== null) {
    return <TakeQuiz quizId={selectedQuizId} onBack={() => { setView("list"); setSelectedQuizId(null); }} />;
  }
  if (view === "create" && isTeacher) {
    return <CreateQuiz onBack={() => setView("list")} />;
  }
  if (view === "results" && selectedQuizId !== null && isTeacher) {
    return <QuizResults quizId={selectedQuizId} onBack={() => { setView("list"); setSelectedQuizId(null); }} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {isTeacher ? "Quiz Management" : "Quizzes"}
          </h1>
        </div>
        {isTeacher && (
          <button
            onClick={() => setView("create")}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" /> Create Quiz
          </button>
        )}
      </div>

      {!isTeacher && <MyResults />}

      <QuizList
        isTeacher={isTeacher}
        onTakeQuiz={(id) => { setSelectedQuizId(id); setView("take"); }}
        onViewResults={(id) => { setSelectedQuizId(id); setView("results"); }}
      />
    </div>
  );
}

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
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400">
        <ClipboardList className="mx-auto mb-3 h-10 w-10" />
        <p>{isTeacher ? "No quizzes created yet." : "No active quizzes available."}</p>
      </div>
    );
  }

  const displayed = isTeacher ? quizzes : quizzes.filter((q) => q.is_active);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {isTeacher ? "All Quizzes" : "Active Quizzes"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {displayed.map((q) => (
          <div
            key={q.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{q.title}</h3>
                {q.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{q.description}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${q.is_active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                {q.is_active ? "Active" : "Closed"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
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
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Results</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {attempts.map((a) => (
          <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{a.quiz_title}</h4>
            <div className="mt-2 flex items-center gap-2">
              <div className={`text-2xl font-bold ${(a.score ?? 0) >= 70 ? "text-green-600" : (a.score ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                {a.score?.toFixed(0)}%
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {a.correct_answers}/{a.total_questions} correct
              </span>
            </div>
            {a.completed_at && (
              <p className="mt-1 text-xs text-gray-400">{new Date(a.completed_at).toLocaleDateString()}</p>
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
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Trophy className={`mx-auto h-16 w-16 ${result.score >= 70 ? "text-green-500" : result.score >= 40 ? "text-yellow-500" : "text-red-500"}`} />
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">Quiz Complete!</h2>
          <div className={`mt-2 text-5xl font-extrabold ${result.score >= 70 ? "text-green-600" : result.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
            {result.score.toFixed(0)}%
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You answered {result.correct} out of {result.total} questions correctly.
          </p>
          <button onClick={onBack} className="mt-6 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-purple-600 hover:underline dark:text-purple-400">
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </button>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{quiz.title}</h2>
        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" /> {quiz.duration_minutes} min
        </span>
      </div>
      {quiz.description && <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.description}</p>}

      <div className="space-y-5">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="font-medium text-gray-900 dark:text-gray-100">
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
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt.id}
                    onChange={() => handleSelect(q.id, opt.id)}
                    className="accent-purple-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{opt.option_text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
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

  const updateQuestion = (qi: number, text: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, question_text: text } : q)));
  };

  const updateOption = (qi: number, oi: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, option_text: text } : o)) } : q
      )
    );
  };

  const setCorrect = (qi: number, oi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) } : q
      )
    );
  };

  const addOption = (qi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, { option_text: "", is_correct: false }] } : q
      )
    );
  };

  const removeOption = (qi: number, oi: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { question_text: "", options: [{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }] },
    ]);
  };

  const removeQuestion = (qi: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== qi));
  };

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
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </button>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <input
            type="text"
            placeholder="Quiz title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">Duration (minutes):</label>
            <input
              type="number"
              min={1}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">Assign to Department:</label>
            <input
              type="text"
              placeholder="Leave blank for all departments"
              value={assignedDepartment}
              onChange={(e) => setAssignedDepartment(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
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
              className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              required
            />
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(qi, oi)}
                    className={`flex-shrink-0 rounded-full p-1 ${opt.is_correct ? "text-green-600" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                    title="Mark as correct"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    placeholder={`Option ${oi + 1}`}
                    value={opt.option_text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onBack} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700">Cancel</button>
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
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </button>

      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Results: {quiz?.title || "Quiz"}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Submissions" value={String(attempts?.length ?? 0)} />
        <StatCard label="Average Score" value={avg + "%"} />
        <StatCard label="Questions" value={String(quiz?.question_count ?? 0)} />
      </div>

      {!attempts?.length ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No submissions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Student</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Score</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Correct</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {attempts.map((a) => (
                <tr key={a.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{a.student_name}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(a.score ?? 0) >= 70 ? "text-green-600" : (a.score ?? 0) >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {a.score?.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.correct_answers}/{a.total_questions}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
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
