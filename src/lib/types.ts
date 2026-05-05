export type DashboardCriterionId = string;

export type DashboardId = string;

export type AdviceStatus =
  | "idle"
  | "analyzing"
  | "analyzed"
  | "editing_prompt"
  | "sending_to_codex"
  | "generating_preview"
  | "preview_ready"
  | "accepted"
  | "error";

export type DeploymentState = "draft_preview" | "temporary_deployed" | "accepted_final";

export type CriterionPriority = "primary" | "secondary";

export type DashboardCriterion = {
  id: DashboardCriterionId;
  label: string;
  description: string;
  priority: CriterionPriority;
  weight: number;
};

export type DashboardConfig = {
  id: DashboardId;
  label: string;
  description: string;
  promptFocus: string;
  criteria: DashboardCriterion[];
  weights: Record<DashboardCriterionId, number>;
  sourceUrl?: string;
  generatedAt?: string;
};

export type CriterionScore = {
  id: DashboardCriterionId;
  label: string;
  score: number;
  summary: string;
};

export type SourceSnapshot = {
  title: string;
  metaDescription: string;
  pageUrl: string;
  headline: string;
  headingCount: number;
  sectionCount: number;
  ctaCount: number;
  formCount: number;
  trustSignalCount: number;
  faqCount: number;
  wordCount: number;
};

export type AnalysisResult = {
  overallScore: number;
  criterionScores: CriterionScore[];
  mainWeakPoints: string[];
  recommendations: string[];
  priorityImprovements: string[];
  sourceSnapshot: SourceSnapshot;
};

export type CodexTarget = {
  id: string;
  label: string;
  description: string;
  category: string;
  endpointMode: "mock" | "api" | "links-thread" | "new-thread";
  messageCount?: number;
  syncedAt?: string;
};

export type RunPayload = {
  sourceUrl: string;
  dashboardId: DashboardId;
  analysis: AnalysisResult;
  prompt: string;
  target: CodexTarget;
};

export type RunResult = {
  runId: string;
  status: AdviceStatus;
  deploymentState: DeploymentState;
  previewUrl: string;
  expiresAt: string;
  finalUrl?: string;
  iteration: number;
  summary: string;
  codexThreadId?: string;
  codexThreadName?: string;
  codexTurnId?: string;
};

export type PageSnapshot = {
  pageUrl: string;
  title: string;
  metaDescription: string;
  headline: string;
  headings: string[];
  ctas: string[];
  forms: string[];
  sections: string[];
  trustSignals: string[];
  faqItems: string[];
  paragraphs: string[];
  bodyText: string;
};

export type AdviceState = {
  status: AdviceStatus;
  url: string;
  recentUrls: string[];
  selectedDashboardId: DashboardId;
  analysis: AnalysisResult | null;
  prompt: string;
  selectedTargetId: string;
  runResult: RunResult | null;
  error: string | null;
};

export type AdviceAction =
  | { type: "set_url"; value: string }
  | { type: "set_recent_urls"; value: string[] }
  | { type: "use_recent_url"; value: string }
  | { type: "set_dashboard"; value: DashboardId }
  | { type: "start_analyze" }
  | { type: "analyze_success"; analysis: AnalysisResult; prompt: string; url: string }
  | { type: "analyze_error"; error: string }
  | { type: "set_prompt"; value: string }
  | { type: "set_target"; value: string }
  | { type: "start_run" }
  | { type: "run_success"; runResult: RunResult }
  | { type: "run_error"; error: string }
  | { type: "refresh_success"; runResult: RunResult }
  | { type: "accept_success"; runResult: RunResult }
  | { type: "clear_error" };

export type StoredRunRecord = {
  runId: string;
  sourceUrl: string;
  dashboardId: DashboardId;
  analysis: AnalysisResult;
  prompt: string;
  target: CodexTarget;
  createdAt: string;
  updatedAt: string;
  deploymentState: DeploymentState;
  expiresAt: string;
  currentIteration: number;
  iterations: Array<{
    iteration: number;
    htmlFile: string;
    createdAt: string;
    summary: string;
  }>;
  finalSlug?: string;
  finalUrl?: string;
  codexThreadId?: string;
  codexThreadName?: string;
  codexTurnId?: string;
};
