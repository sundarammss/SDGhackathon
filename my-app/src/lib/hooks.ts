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
  sendPeerRequest,
  fetchIncomingRequests,
  fetchOutgoingRequests,
  acceptPeerRequest,
  rejectPeerRequest,
  fetchConversations,
  fetchMessages,
  sendMessage,
  fetchPeerConnections,
  blockPeer,
  unblockPeer,
  fetchBlockedPeers,
  fetchExamMarks,
  createExamMark,
  updateExamMark,
  deleteExamMark,
  fetchAttendanceBatches,
  fetchAttendanceStudents,
  submitAttendance,
  fetchAttendance,
  type ExamMarkOut,
  type ExamMarkCreate,
  type ExamMarkUpdate,
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
  type PeerRequestOut,
  type ConversationOut,
  type MessageOut,
  type PeerConnectionOut,
  type PeerBlockOut,
  type BatchInfo,
  type BatchStudentOut,
  type AttendanceBulkCreate,
  type AttendanceOut,
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

// ── Peer Request Hooks ───────────────────────────────────────────────

export function useIncomingRequests(): UseQueryResult<PeerRequestOut[]> {
  return useQuery({
    queryKey: ["peer-requests", "incoming"],
    queryFn: fetchIncomingRequests,
    refetchInterval: 10_000,
  });
}

export function useOutgoingRequests(): UseQueryResult<PeerRequestOut[]> {
  return useQuery({
    queryKey: ["peer-requests", "outgoing"],
    queryFn: fetchOutgoingRequests,
    staleTime: 10_000,
  });
}

export function useSendPeerRequest() {
  const qc = useQueryClient();
  return useMutation<{ id: number; status: string }, Error, number>({
    mutationFn: sendPeerRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["peer-requests"] });
    },
  });
}

export function useAcceptPeerRequest() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, number>({
    mutationFn: acceptPeerRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["peer-requests"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRejectPeerRequest() {
  const qc = useQueryClient();
  return useMutation<{ status: string }, Error, number>({
    mutationFn: rejectPeerRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["peer-requests"] });
    },
  });
}

// ── Chat Hooks ───────────────────────────────────────────────────────

export function useConversations(): UseQueryResult<ConversationOut[]> {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    refetchInterval: 5_000,
  });
}

export function useMessages(convId: number | null): UseQueryResult<MessageOut[]> {
  return useQuery({
    queryKey: ["messages", convId],
    queryFn: () => fetchMessages(convId!),
    enabled: convId !== null,
    refetchInterval: 3_000,
  });
}

export function useSendMessage(convId: number) {
  const qc = useQueryClient();
  return useMutation<MessageOut, Error, string>({
    mutationFn: (body) => sendMessage(convId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", convId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function usePeerConnections(): UseQueryResult<PeerConnectionOut[]> {
  return useQuery({
    queryKey: ["peer-connections"],
    queryFn: fetchPeerConnections,
    staleTime: 30_000,
  });
}

// ── Block Hooks ──────────────────────────────────────────────────

export function useBlockPeer() {
  const qc = useQueryClient();
  return useMutation<PeerBlockOut, Error, number>({
    mutationFn: blockPeer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["blocked-peers"] });
    },
  });
}

export function useUnblockPeer() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: unblockPeer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["blocked-peers"] });
    },
  });
}

export function useBlockedPeers(): UseQueryResult<PeerBlockOut[]> {
  return useQuery({
    queryKey: ["blocked-peers"],
    queryFn: fetchBlockedPeers,
    staleTime: 10_000,
  });
}

// ── Exam Marks Hooks ─────────────────────────────────────────────────

export function useExamMarks(
  studentId?: number,
  examName?: string
): UseQueryResult<ExamMarkOut[]> {
  return useQuery({
    queryKey: ["exam-marks", studentId, examName],
    queryFn: () => fetchExamMarks(studentId, examName),
    staleTime: 15_000,
  });
}

export function useCreateExamMark() {
  const qc = useQueryClient();
  return useMutation<ExamMarkOut, Error, ExamMarkCreate>({
    mutationFn: createExamMark,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-marks"] }); },
  });
}

export function useUpdateExamMark() {
  const qc = useQueryClient();
  return useMutation<ExamMarkOut, Error, { examId: number; payload: ExamMarkUpdate }>({
    mutationFn: ({ examId, payload }) => updateExamMark(examId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-marks"] }); },
  });
}

export function useDeleteExamMark() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteExamMark,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exam-marks"] }); },
  });
}

// ── Attendance Hooks ─────────────────────────────────────────────────

export function useAttendanceBatches(): UseQueryResult<BatchInfo[]> {
  return useQuery({
    queryKey: ["attendance", "batches"],
    queryFn: fetchAttendanceBatches,
    staleTime: 60_000,
  });
}

export function useAttendanceStudents(params: {
  batch_start_year?: number;
  batch_end_year?: number;
  section?: string | null;
  enabled?: boolean;
}): UseQueryResult<BatchStudentOut[]> {
  return useQuery({
    queryKey: ["attendance", "students", params.batch_start_year, params.batch_end_year, params.section],
    queryFn: () => fetchAttendanceStudents(params),
    enabled: params.enabled !== false && params.batch_start_year !== undefined,
    staleTime: 30_000,
  });
}

export function useSubmitAttendance() {
  const qc = useQueryClient();
  return useMutation<{ saved: number }, Error, AttendanceBulkCreate>({
    mutationFn: submitAttendance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); },
  });
}

export function useAttendance(params: {
  date_val?: string;
  batch_start_year?: number;
  batch_end_year?: number;
  section?: string | null;
}): UseQueryResult<AttendanceOut[]> {
  return useQuery({
    queryKey: ["attendance", "records", params],
    queryFn: () => fetchAttendance(params),
    staleTime: 15_000,
  });
}
