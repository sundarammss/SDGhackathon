import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  fetchStudents,
  fetchRiskProfile,
  postWhatIf,
  fetchForumPosts,
  fetchForumPost,
  createForumPost,
  createForumReply,
  fetchQuizzes,
  fetchQuiz,
  createQuiz,
  submitQuiz,
  fetchMyAttempts,
  fetchQuizAttempts,
  toggleQuizActive,
  fetchPeerMatches,
  type DashboardSummary,
  type StudentOut,
  type RiskProfile,
  type WhatIfRequest,
  type WhatIfResponse,
  type ForumPostOut,
  type ForumPostDetail,
  type ForumPostCreate,
  type ForumReplyCreate,
  type ForumReplyOut,
  type QuizOut,
  type QuizDetail,
  type QuizCreate,
  type QuizSubmit,
  type QuizAttemptOut,
  type PeerMatchResponse,
} from "./api";

export function useDashboardSummary(): UseQueryResult<DashboardSummary> {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
  });
}

export function useStudents(): UseQueryResult<StudentOut[]> {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    staleTime: 60_000,
  });
}

export function useRiskProfile(
  studentId: number | null
): UseQueryResult<RiskProfile> {
  return useQuery({
    queryKey: ["risk-profile", studentId],
    queryFn: () => fetchRiskProfile(studentId!),
    enabled: studentId !== null,
    staleTime: 30_000,
  });
}

export function useWhatIfMutation(): UseMutationResult<
  WhatIfResponse,
  Error,
  { studentId: number; payload: WhatIfRequest }
> {
  return useMutation({
    mutationFn: ({ studentId, payload }) => postWhatIf(studentId, payload),
  });
}

// ── Forum Hooks ──────────────────────────────────────────────────────

export function useForumPosts(): UseQueryResult<ForumPostOut[]> {
  return useQuery({ queryKey: ["forum", "posts"], queryFn: fetchForumPosts, staleTime: 15_000 });
}

export function useForumPost(postId: number | null): UseQueryResult<ForumPostDetail> {
  return useQuery({ queryKey: ["forum", "post", postId], queryFn: () => fetchForumPost(postId!), enabled: postId !== null, staleTime: 10_000 });
}

export function useCreateForumPost() {
  const qc = useQueryClient();
  return useMutation<ForumPostOut, Error, ForumPostCreate>({
    mutationFn: createForumPost,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum", "posts"] }); },
  });
}

export function useCreateForumReply(postId: number) {
  const qc = useQueryClient();
  return useMutation<ForumReplyOut, Error, ForumReplyCreate>({
    mutationFn: (payload) => createForumReply(postId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum", "post", postId] }); },
  });
}

// ── Quiz Hooks ───────────────────────────────────────────────────────

export function useQuizzes(activeOnly = false): UseQueryResult<QuizOut[]> {
  return useQuery({ queryKey: ["quizzes", activeOnly], queryFn: () => fetchQuizzes(activeOnly), staleTime: 15_000 });
}

export function useQuiz(quizId: number | null): UseQueryResult<QuizDetail> {
  return useQuery({ queryKey: ["quiz", quizId], queryFn: () => fetchQuiz(quizId!), enabled: quizId !== null, staleTime: 10_000 });
}

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation<QuizOut, Error, QuizCreate>({
    mutationFn: createQuiz,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); },
  });
}

export function useSubmitQuiz(quizId: number) {
  const qc = useQueryClient();
  return useMutation<QuizAttemptOut, Error, QuizSubmit>({
    mutationFn: (payload) => submitQuiz(quizId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-attempts"] });
      qc.invalidateQueries({ queryKey: ["quiz-attempts", quizId] });
    },
  });
}

export function useMyAttempts(): UseQueryResult<QuizAttemptOut[]> {
  return useQuery({ queryKey: ["my-attempts"], queryFn: fetchMyAttempts, staleTime: 15_000 });
}

export function useQuizAttempts(quizId: number | null): UseQueryResult<QuizAttemptOut[]> {
  return useQuery({ queryKey: ["quiz-attempts", quizId], queryFn: () => fetchQuizAttempts(quizId!), enabled: quizId !== null, staleTime: 15_000 });
}

export function useToggleQuiz() {
  const qc = useQueryClient();
  return useMutation<QuizOut, Error, number>({
    mutationFn: toggleQuizActive,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); },
  });
}

// ── Peer Matching Hooks ──────────────────────────────────────────────

export function usePeerMatches(studentId: number | null): UseQueryResult<PeerMatchResponse> {
  return useQuery({
    queryKey: ["peer-matches", studentId],
    queryFn: () => fetchPeerMatches(studentId!),
    enabled: studentId !== null,
    staleTime: 60_000,
  });
}
