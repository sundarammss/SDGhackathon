import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchDashboardSummary,
  fetchMyStudyStreak,
  fetchStudents,
  fetchStudentNotifications,
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
  fetchMyCompetitions,
  fetchAllCompetitions,
  submitCompetition,
  approveCompetition,
  rejectCompetition,
  fetchAssignments,
  createAssignment,
  deleteAssignment,
  submitAssignmentPdf,
  fetchMyAssignmentSubmission,
  fetchAssignmentSubmissions,
  fetchSubmissionFile,
  approveSubmission,
  uploadStudyResource,
  fetchMyStudyResources,
  fetchStudyResourcesBySubject,
  searchStudyResources,
  importYouTubeStudyResource,
  deleteStudyResource,
  downloadStudyResource,
  type AssignmentOut,
  type AssignmentSubmissionOut,
  type StudyResourceUploadOut,
  type YouTubeImportOut,
  type StudyResourceOut,
  type StudyResourceSearchOut,
  type CompetitionOut,
  type ExamMarkOut,
  type ExamMarkCreate,
  type ExamMarkUpdate,
  type DashboardSummary,
  type StudyStreakOut,
  type StudentOut,
  type StudentNotificationOut,
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

export function useMyStudyStreak(): UseQueryResult<StudyStreakOut> {
  return useQuery({
    queryKey: ["dashboard", "my-streak"],
    queryFn: fetchMyStudyStreak,
    staleTime: 10_000,
  });
}

export function useStudents(): UseQueryResult<StudentOut[]> {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    staleTime: 60_000,
  });
}

export function useStudentNotifications(enabled = true): UseQueryResult<StudentNotificationOut[]> {
  return useQuery({
    queryKey: ["student-notifications"],
    queryFn: fetchStudentNotifications,
    refetchInterval: 30_000,
    staleTime: 10_000,
    enabled,
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

export function useExamMarks(opts?: {
  studentId?: number;
  examName?: string;
  batchStartYear?: number;
  batchEndYear?: number;
  section?: string | null;
}): UseQueryResult<ExamMarkOut[]> {
  return useQuery({
    queryKey: ["exam-marks", opts?.studentId, opts?.examName, opts?.batchStartYear, opts?.batchEndYear, opts?.section],
    queryFn: () => fetchExamMarks(opts),
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

// ── Competition Hooks ────────────────────────────────────────────────

export function useMyCompetitions(): UseQueryResult<CompetitionOut[]> {
  return useQuery({
    queryKey: ["competitions", "my"],
    queryFn: fetchMyCompetitions,
    staleTime: 15_000,
  });
}

export function useAllCompetitions(
  approvalStatus?: string
): UseQueryResult<CompetitionOut[]> {
  return useQuery({
    queryKey: ["competitions", "all", approvalStatus],
    queryFn: () => fetchAllCompetitions(approvalStatus),
    staleTime: 15_000,
  });
}

export function useSubmitCompetition(): UseMutationResult<
  CompetitionOut,
  Error,
  FormData
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitCompetition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useApproveCompetition(): UseMutationResult<
  CompetitionOut,
  Error,
  number
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveCompetition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useRejectCompetition(): UseMutationResult<
  CompetitionOut,
  Error,
  number
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectCompetition,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

// ── Assignment Hooks ─────────────────────────────────────────────────

export function useAssignments(): UseQueryResult<AssignmentOut[]> {
  return useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
    staleTime: 15_000,
  });
}

export function useCreateAssignment(): UseMutationResult<AssignmentOut, Error, FormData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignments"] }); },
  });
}

export function useDeleteAssignment(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignments"] }); },
  });
}

export function useSubmitAssignmentPdf(
  assignmentId: number
): UseMutationResult<AssignmentSubmissionOut, Error, FormData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fd) => submitAssignmentPdf(assignmentId, fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-assignment-submission", assignmentId] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

export function useMyAssignmentSubmission(
  assignmentId: number | null
): UseQueryResult<AssignmentSubmissionOut | null> {
  return useQuery({
    queryKey: ["my-assignment-submission", assignmentId],
    queryFn: () => fetchMyAssignmentSubmission(assignmentId!),
    enabled: assignmentId !== null,
    staleTime: 15_000,
  });
}

export function useAssignmentSubmissions(
  assignmentId: number | null
): UseQueryResult<AssignmentSubmissionOut[]> {
  return useQuery({
    queryKey: ["assignment-submissions", assignmentId],
    queryFn: () => fetchAssignmentSubmissions(assignmentId!),
    enabled: assignmentId !== null,
    staleTime: 10_000,
  });
}

export function useApproveSubmission(): UseMutationResult<
  AssignmentSubmissionOut,
  Error,
  { submissionId: number; marks: number | null }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, marks }) => approveSubmission(submissionId, marks),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignment-submissions"] }); },
  });
}

export { fetchSubmissionFile };
export type { AssignmentOut, AssignmentSubmissionOut };

// ── Study Resources Hooks ───────────────────────────────────────────

export function useMyStudyResources(): UseQueryResult<StudyResourceOut[]> {
  return useQuery({
    queryKey: ["study-resources", "my"],
    queryFn: fetchMyStudyResources,
    staleTime: 10_000,
  });
}

export function useStudyResourcesBySubject(subject: string): UseQueryResult<StudyResourceOut[]> {
  return useQuery({
    queryKey: ["study-resources", "subject", subject],
    queryFn: () => fetchStudyResourcesBySubject(subject),
    staleTime: 10_000,
  });
}

export function useSemanticStudySearch(
  query: string,
  subject: string
): UseQueryResult<StudyResourceSearchOut[]> {
  return useQuery({
    queryKey: ["study-resources", "search", query, subject],
    queryFn: () => searchStudyResources(query, subject),
    enabled: query.trim().length >= 2,
    staleTime: 5_000,
  });
}

export function useUploadStudyResource(): UseMutationResult<StudyResourceUploadOut, Error, FormData> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadStudyResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-resources"] });
    },
  });
}

export function useDeleteStudyResource(): UseMutationResult<void, Error, number> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteStudyResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-resources"] });
    },
  });
}

export function useImportYouTubeStudyResource(): UseMutationResult<YouTubeImportOut, Error, { url: string; subject?: string }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importYouTubeStudyResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["study-resources"] });
    },
  });
}

export { downloadStudyResource };
export type { StudyResourceOut, StudyResourceSearchOut, StudyResourceUploadOut, YouTubeImportOut };
