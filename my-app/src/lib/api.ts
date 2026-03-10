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
