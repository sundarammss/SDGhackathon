import axios from "axios";
import { useAuthStore } from "./auth";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Inject the current user's role and id into every request
api.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user;
  if (user) {
    config.headers["X-User-Role"] = user.role;
    config.headers["X-User-Id"] = String(user.id);
  }
  return config;
});

export default api;

// ── Types ────────────────────────────────────────────────────────────

export interface ShapFeature {
  feature: string;
  value: number;
  impact: number;
}

export interface RiskProfile {
  student_id: number;
  student_name: string;
  at_risk_probability: number;
  academic_health_score: number;
  burnout_category: string;
  shap_explanation: ShapFeature[];
  recommended_interventions: string[];
  computed_at: string;
  cis_score?: number | null;
}

export interface CohortRiskRow {
  student_id: number;
  student_name: string;
  department: string | null;
  section: string | null;
  batch: string | null;
  at_risk_probability: number;
  academic_health_score: number;
  burnout_category: string;
  top_risk_factor: string;
  cis_score?: number | null;
}

export interface CourseDifficultyRow {
  course_id: number;
  course_code: string;
  course_title: string;
  department: string | null;
  difficulty_rating: number;
  avg_student_risk: number;
  enrollment_count: number;
}

export interface DashboardSummary {
  total_students: number;
  at_risk_count: number;
  avg_health_score: number;
  cohort_risks: CohortRiskRow[];
  course_heatmap: CourseDifficultyRow[];
}

export interface StudyStreakOut {
  student_id: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface WhatIfRequest {
  attendance_change_pct: number;
  study_hours_change: number;
  assignment_completion_change_pct: number;
  forum_participation_change: number;
}

export interface WhatIfResponse {
  student_id: number;
  current_risk: number;
  projected_risk: number;
  current_predicted_grade: number;
  projected_predicted_grade: number;
  factors: ShapFeature[];
}

export interface StudentOut {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  section: string | null;
  batch_start_year: number | null;
  batch_end_year: number | null;
  created_at: string;
}

// ── API Functions ────────────────────────────────────────────────────

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await api.get("/api/v1/dashboard/summary");
  return data;
};

export const fetchMyStudyStreak = async (): Promise<StudyStreakOut> => {
  const { data } = await api.get("/api/v1/dashboard/my-streak");
  return data;
};

export const fetchStudents = async (): Promise<StudentOut[]> => {
  const { data } = await api.get("/api/v1/students/");
  return data;
};

export const fetchRiskProfile = async (
  studentId: number
): Promise<RiskProfile> => {
  const { data } = await api.get(
    `/api/v1/students/${studentId}/risk-profile`
  );
  return data;
};

export const postWhatIf = async (
  studentId: number,
  payload: WhatIfRequest
): Promise<WhatIfResponse> => {
  const { data } = await api.post(
    `/api/v1/students/${studentId}/what-if`,
    payload
  );
  return data;
};

// ── Peer Matching Types ──────────────────────────────────────────────

export interface PeerMatch {
  peer_id: number;
  peer_name: string;
  compatibility_score: number;
  complementary_strengths: string[];
}

export interface PeerMatchResponse {
  student_id: number;
  matches: PeerMatch[];
}

export const fetchPeerMatches = async (
  studentId: number
): Promise<PeerMatchResponse> => {
  const { data } = await api.get(
    `/api/v1/students/${studentId}/peer-matches`
  );
  return data;
};

// ── Forum Types ──────────────────────────────────────────────────────

export interface ForumReplyOut {
  id: number;
  post_id: number;
  author_id: number;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface ForumPostOut {
  id: number;
  author_id: number;
  author_name: string | null;
  title: string;
  body: string;
  course_id: number | null;
  course_name: string | null;
  reply_count: number;
  created_at: string;
}

export interface ForumPostDetail extends ForumPostOut {
  replies: ForumReplyOut[];
}

export interface ForumPostCreate {
  title: string;
  body: string;
  course_id?: number | null;
}

export interface ForumReplyCreate {
  body: string;
}

// ── Quiz Types ───────────────────────────────────────────────────────

export interface QuizOptionOut {
  id: number;
  option_text: string;
}

export interface QuizQuestionOut {
  id: number;
  question_text: string;
  order: number;
  options: QuizOptionOut[];
}

export interface QuizOut {
  id: number;
  title: string;
  description: string | null;
  course_id: number | null;
  created_by: number;
  creator_name: string | null;
  assigned_department: string | null;
  is_active: boolean;
  duration_minutes: number;
  question_count: number;
  created_at: string;
}

export interface QuizDetail extends QuizOut {
  questions: QuizQuestionOut[];
}

export interface QuizSubmitAnswer {
  question_id: number;
  selected_option_id: number;
}

export interface QuizSubmit {
  answers: QuizSubmitAnswer[];
}

export interface QuizAttemptOut {
  id: number;
  quiz_id: number;
  quiz_title: string | null;
  student_id: number;
  student_name: string | null;
  score: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string | null;
}

export interface QuizOptionCreate {
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestionCreate {
  question_text: string;
  options: QuizOptionCreate[];
}

export interface QuizCreate {
  title: string;
  description?: string | null;
  course_id?: number | null;
  duration_minutes?: number;
  assigned_department?: string | null;
  questions: QuizQuestionCreate[];
}

// ── Forum API Functions ──────────────────────────────────────────────

export const fetchForumPosts = async (): Promise<ForumPostOut[]> => {
  const { data } = await api.get("/api/v1/forum/posts");
  return data;
};

export const fetchForumPost = async (postId: number): Promise<ForumPostDetail> => {
  const { data } = await api.get(`/api/v1/forum/posts/${postId}`);
  return data;
};

export const createForumPost = async (payload: ForumPostCreate): Promise<ForumPostOut> => {
  const { data } = await api.post("/api/v1/forum/posts", payload);
  return data;
};

export const createForumReply = async (postId: number, payload: ForumReplyCreate): Promise<ForumReplyOut> => {
  const { data } = await api.post(`/api/v1/forum/posts/${postId}/replies`, payload);
  return data;
};

// ── Quiz API Functions ───────────────────────────────────────────────

export const fetchQuizzes = async (activeOnly = false): Promise<QuizOut[]> => {
  const { data } = await api.get("/api/v1/quiz/quizzes", { params: activeOnly ? { active_only: true } : {} });
  return data;
};

export const fetchQuiz = async (quizId: number): Promise<QuizDetail> => {
  const { data } = await api.get(`/api/v1/quiz/quizzes/${quizId}`);
  return data;
};

export const createQuiz = async (payload: QuizCreate): Promise<QuizOut> => {
  const { data } = await api.post("/api/v1/quiz/quizzes", payload);
  return data;
};

export const submitQuiz = async (quizId: number, payload: QuizSubmit): Promise<QuizAttemptOut> => {
  const { data } = await api.post(`/api/v1/quiz/quizzes/${quizId}/submit`, payload);
  return data;
};

export const fetchQuizAttempts = async (quizId: number): Promise<QuizAttemptOut[]> => {
  const { data } = await api.get(`/api/v1/quiz/quizzes/${quizId}/attempts`);
  return data;
};

export const fetchMyAttempts = async (): Promise<QuizAttemptOut[]> => {
  const { data } = await api.get("/api/v1/quiz/my-attempts");
  return data;
};

export const toggleQuizActive = async (quizId: number): Promise<QuizOut> => {
  const { data } = await api.patch(`/api/v1/quiz/quizzes/${quizId}/toggle`);
  return data;
};

// ── Peer Request Types ───────────────────────────────────────────────

export interface PeerRequestOut {
  id: number;
  from_student_id: number;
  from_student_name: string;
  to_student_id: number;
  to_student_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

// ── Chat Types ───────────────────────────────────────────────────────

export interface ConversationOut {
  id: number;
  other_student_id: number;
  other_student_name: string;
  last_message: string | null;
  created_at: string;
  is_blocked: boolean;
  blocked_by_me: boolean;
}

export interface MessageOut {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
}

// ── Peer Request API ─────────────────────────────────────────────────

export const sendPeerRequest = async (toStudentId: number): Promise<{ id: number; status: string }> => {
  const { data } = await api.post("/api/v1/peer-requests/", { to_student_id: toStudentId });
  return data;
};

export const fetchIncomingRequests = async (): Promise<PeerRequestOut[]> => {
  const { data } = await api.get("/api/v1/peer-requests/incoming");
  return data;
};

export const fetchOutgoingRequests = async (): Promise<PeerRequestOut[]> => {
  const { data } = await api.get("/api/v1/peer-requests/outgoing");
  return data;
};

export const acceptPeerRequest = async (requestId: number): Promise<{ status: string }> => {
  const { data } = await api.patch(`/api/v1/peer-requests/${requestId}/accept`);
  return data;
};

export const rejectPeerRequest = async (requestId: number): Promise<{ status: string }> => {
  const { data } = await api.patch(`/api/v1/peer-requests/${requestId}/reject`);
  return data;
};

// ── Conversations API ────────────────────────────────────────────────

export const fetchConversations = async (): Promise<ConversationOut[]> => {
  const { data } = await api.get("/api/v1/conversations/");
  return data;
};

export const fetchMessages = async (convId: number): Promise<MessageOut[]> => {
  const { data } = await api.get(`/api/v1/conversations/${convId}/messages`);
  return data;
};

export const sendMessage = async (convId: number, body: string): Promise<MessageOut> => {
  const { data } = await api.post(`/api/v1/conversations/${convId}/messages`, { body });
  return data;
};

// ── Block / Unblock API ──────────────────────────────────────────────

export interface PeerBlockOut {
  id: number;
  blocker_id: number;
  blocked_id: number;
  created_at: string;
}

export const blockPeer = async (blockedStudentId: number): Promise<PeerBlockOut> => {
  const { data } = await api.post("/api/v1/blocks/", { blocked_student_id: blockedStudentId });
  return data;
};

export const unblockPeer = async (blockedStudentId: number): Promise<void> => {
  await api.delete(`/api/v1/blocks/${blockedStudentId}`);
};

export const fetchBlockedPeers = async (): Promise<PeerBlockOut[]> => {
  const { data } = await api.get("/api/v1/blocks/");
  return data;
};

// ── Peer Connections (teacher/admin view) ────────────────────────────

export interface PeerConnectionOut {
  request_id: number;
  student_a_id: number;
  student_a_name: string;
  student_a_department: string | null;
  student_b_id: number;
  student_b_name: string;
  student_b_department: string | null;
  connected_at: string;
}

export const fetchPeerConnections = async (): Promise<PeerConnectionOut[]> => {
  const { data } = await api.get("/api/v1/peer-connections/");
  return data;
};

// ── Exam Marks Types ─────────────────────────────────────────────────

export interface ExamMarkOut {
  id: number;
  student_id: number;
  student_name: string;
  exam_name: string;
  marks: number;
  exam_date: string;
  created_at: string;
}

export interface ExamMarkCreate {
  student_id: number;
  exam_name: string;
  marks: number;
  exam_date: string;
}

export interface ExamMarkUpdate {
  exam_name?: string;
  marks?: number;
  exam_date?: string;
}

// ── Exam Marks API ───────────────────────────────────────────────────

export const fetchExamMarks = async (opts?: {
  studentId?: number;
  examName?: string;
  batchStartYear?: number;
  batchEndYear?: number;
  section?: string | null;
}): Promise<ExamMarkOut[]> => {
  const params: Record<string, string | number> = {};
  if (opts?.studentId !== undefined) params.student_id = opts.studentId;
  if (opts?.examName !== undefined) params.exam_name = opts.examName;
  if (opts?.batchStartYear !== undefined) params.batch_start_year = opts.batchStartYear;
  if (opts?.batchEndYear !== undefined) params.batch_end_year = opts.batchEndYear;
  if (opts?.section) params.section = opts.section;
  const { data } = await api.get("/api/v1/exam-marks/", { params });
  return data;
};

export const createExamMark = async (
  payload: ExamMarkCreate
): Promise<ExamMarkOut> => {
  const { data } = await api.post("/api/v1/exam-marks/", payload);
  return data;
};

export const updateExamMark = async (
  examId: number,
  payload: ExamMarkUpdate
): Promise<ExamMarkOut> => {
  const { data } = await api.put(`/api/v1/exam-marks/${examId}`, payload);
  return data;
};

export const deleteExamMark = async (examId: number): Promise<void> => {
  await api.delete(`/api/v1/exam-marks/${examId}`);
};

// ── Attendance Types ─────────────────────────────────────────────────

export interface BatchStudentOut {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  section: string | null;
  department: string;
  batch: string;
}

export interface BatchInfo {
  batch_start_year: number;
  batch_end_year: number;
  section: string | null;
  label: string;
}

export interface AttendanceRecord {
  student_id: number;
  status: "present" | "absent";
}

export interface AttendanceBulkCreate {
  date: string;
  subject?: string | null;
  records: AttendanceRecord[];
}

export interface AttendanceOut {
  id: number;
  student_id: number;
  student_name: string;
  teacher_id: number;
  date: string;
  status: "present" | "absent";
  subject: string | null;
  created_at: string;
}

// ── Attendance API ───────────────────────────────────────────────────

export const fetchAttendanceBatches = async (): Promise<BatchInfo[]> => {
  const { data } = await api.get("/api/v1/attendance/batches");
  return data;
};

export const fetchAttendanceStudents = async (params: {
  batch_start_year?: number;
  batch_end_year?: number;
  section?: string | null;
}): Promise<BatchStudentOut[]> => {
  const p: Record<string, string | number> = {};
  if (params.batch_start_year !== undefined) p.batch_start_year = params.batch_start_year;
  if (params.batch_end_year !== undefined) p.batch_end_year = params.batch_end_year;
  if (params.section) p.section = params.section;
  const { data } = await api.get("/api/v1/attendance/students", { params: p });
  return data;
};

export const submitAttendance = async (
  payload: AttendanceBulkCreate
): Promise<{ saved: number }> => {
  const { data } = await api.post("/api/v1/attendance/submit", payload);
  return data;
};

export const fetchAttendance = async (params: {
  date_val?: string;
  student_id?: number;
  batch_start_year?: number;
  batch_end_year?: number;
  section?: string | null;
}): Promise<AttendanceOut[]> => {
  const p: Record<string, string | number> = {};
  if (params.date_val) p.date_val = params.date_val;
  if (params.student_id !== undefined) p.student_id = params.student_id;
  if (params.batch_start_year !== undefined) p.batch_start_year = params.batch_start_year;
  if (params.batch_end_year !== undefined) p.batch_end_year = params.batch_end_year;
  if (params.section) p.section = params.section;
  const { data } = await api.get("/api/v1/attendance/", { params: p });
  return data;
};

// ── Competition Types ────────────────────────────────────────────────

export interface CompetitionOut {
  id: number;
  student_id: number;
  student_name: string;
  competition_name: string;
  competition_date: string;
  status: "Winner" | "Runner-up" | "Participated";
  proof_file: string | null;
  approval_status: "Pending" | "Approved" | "Rejected";
  approved_by: number | null;
  created_at: string;
  updated_at: string;
}

// ── Competition API ──────────────────────────────────────────────────

export const fetchMyCompetitions = async (): Promise<CompetitionOut[]> => {
  const { data } = await api.get("/api/v1/competitions/my");
  return data;
};

export const fetchAllCompetitions = async (
  approvalStatus?: string
): Promise<CompetitionOut[]> => {
  const params = approvalStatus ? { approval_status: approvalStatus } : {};
  const { data } = await api.get("/api/v1/competitions/", { params });
  return data;
};

export const submitCompetition = async (
  formData: FormData
): Promise<CompetitionOut> => {
  // Do not set Content-Type manually — axios will set multipart/form-data with boundary
  const { data } = await api.post("/api/v1/competitions/", formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
};

export const approveCompetition = async (
  compId: number
): Promise<CompetitionOut> => {
  const { data } = await api.patch(`/api/v1/competitions/${compId}/approve`);
  return data;
};

export const rejectCompetition = async (
  compId: number
): Promise<CompetitionOut> => {
  const { data } = await api.patch(`/api/v1/competitions/${compId}/reject`);
  return data;
};

export const fetchProofBlob = async (compId: number): Promise<Blob> => {
  const { data } = await api.get(`/api/v1/competitions/${compId}/proof`, {
    responseType: "blob",
  });
  return data;
};

// ── Assignment Types ─────────────────────────────────────────────────

export interface AssignmentOut {
  id: number;
  title: string;
  description: string | null;
  due_date: string;
  department: string;
  batch_start_year: number;
  batch_end_year: number;
  section: string | null;
  created_by: number;
  creator_name: string | null;
  submission_count: number;
  created_at: string;
}

export interface AssignmentSubmissionOut {
  id: number;
  assignment_id: number;
  assignment_title: string | null;
  student_id: number;
  student_name: string | null;
  file_path: string;
  submitted_at: string;
  is_approved: boolean;
}

// ── Assignment API ───────────────────────────────────────────────────

export const fetchAssignments = async (): Promise<AssignmentOut[]> => {
  const { data } = await api.get("/api/v1/assignments/");
  return data;
};

export const createAssignment = async (
  formData: FormData
): Promise<AssignmentOut> => {
  const { data } = await api.post("/api/v1/assignments/", formData, {
    headers: { "Content-Type": undefined },
  });
  return data;
};

export const deleteAssignment = async (assignmentId: number): Promise<void> => {
  await api.delete(`/api/v1/assignments/${assignmentId}`);
};

export const submitAssignmentPdf = async (
  assignmentId: number,
  formData: FormData
): Promise<AssignmentSubmissionOut> => {
  const { data } = await api.post(
    `/api/v1/assignments/${assignmentId}/submit`,
    formData,
    { headers: { "Content-Type": undefined } }
  );
  return data;
};

export const fetchMyAssignmentSubmission = async (
  assignmentId: number
): Promise<AssignmentSubmissionOut | null> => {
  const { data } = await api.get(
    `/api/v1/assignments/${assignmentId}/my-submission`
  );
  return data;
};

export const fetchAssignmentSubmissions = async (
  assignmentId: number
): Promise<AssignmentSubmissionOut[]> => {
  const { data } = await api.get(
    `/api/v1/assignments/${assignmentId}/submissions`
  );
  return data;
};

export const fetchSubmissionFile = async (
  submissionId: number
): Promise<Blob> => {
  const { data } = await api.get(
    `/api/v1/assignments/submissions/${submissionId}/file`,
    { responseType: "blob" }
  );
  return data;
};

export const approveSubmission = async (
  submissionId: number,
  marks: number | null
): Promise<AssignmentSubmissionOut> => {
  const { data } = await api.patch(
    `/api/v1/assignments/submissions/${submissionId}/approve`,
    { marks }
  );
  return data;
};

// ── Study Resources Types ───────────────────────────────────────────

export interface StudyResourceUploadOut {
  resource_id: number;
  upload_status: string;
}

export interface StudyResourceOut {
  id: number;
  title: string;
  subject: string;
  description: string | null;
  tags: string[];
  teacher_id: number;
  teacher_name: string | null;
  file_type: string;
  file_url: string;
  created_at: string;
}

export interface YouTubeImportOut {
  requested_url: string;
  total_videos: number;
  indexed_videos: number;
  failed_videos: number;
  task_id?: string | null;
  status?: string | null;
}

export interface StudyResourceSearchOut {
  resource_id: number;
  title: string;
  subject: string;
  description: string | null;
  file_url: string;
  similarity_score: number;
  file_type?: string | null;
  source?: "resource" | "youtube";
  video_id?: string | null;
  timestamp?: number | null;
}

// ── Study Resources API ─────────────────────────────────────────────

export const uploadStudyResource = async (
  formData: FormData
): Promise<StudyResourceUploadOut> => {
  const { data } = await api.post("/api/v1/resources/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const fetchMyStudyResources = async (): Promise<StudyResourceOut[]> => {
  const { data } = await api.get("/api/v1/resources/my");
  return data;
};

export const fetchStudyResourcesBySubject = async (
  subject: string
): Promise<StudyResourceOut[]> => {
  const { data } = await api.get(`/api/v1/resources/subject/${encodeURIComponent(subject)}`);
  return data;
};

export const searchStudyResources = async (
  q: string,
  subject?: string
): Promise<StudyResourceSearchOut[]> => {
  const params: Record<string, string> = { q };
  if (subject && subject !== "all") params.subject = subject;
  const { data } = await api.get("/api/v1/resources/search", { params });
  return data;
};

export const importYouTubeStudyResource = async (
  payload: { url: string; subject: string }
): Promise<YouTubeImportOut> => {
  const { data } = await api.post("/api/v1/resources/youtube/import", payload);
  return data;
};

export const downloadStudyResource = async (resourceId: number): Promise<Blob> => {
  const { data } = await api.get(`/api/v1/resources/download/${resourceId}`, {
    responseType: "blob",
  });
  return data;
};

export const deleteStudyResource = async (resourceId: number): Promise<void> => {
  await api.delete(`/api/v1/resources/${resourceId}`);
};
