import { RuleBasedAnalyzer } from "@/lib/analysis/analyzer";
import { fetchPageSnapshot } from "@/lib/analysis/fetch-page";
import { MockCodexClient } from "@/lib/codex/mock-client";
import { OpenAICodexClient } from "@/lib/codex/openai-client";
import { UnavailableCodexClient } from "@/lib/codex/unavailable-client";
import { fetchDashboardConfigById, fetchDashboardConfigs } from "@/lib/dashboard-configs";

export const analyzer = new RuleBasedAnalyzer();

function canUseMockClient() {
  return process.env.ADVICE_ENABLE_MOCK_GENERATION === "1" || process.env.NODE_ENV !== "production";
}

function createCodexClient() {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAICodexClient();
  }

  if (canUseMockClient()) {
    return new MockCodexClient();
  }

  return new UnavailableCodexClient();
}

export const codexClient = createCodexClient();

export async function analyzeUrl(url: string, dashboardId: string) {
  const snapshot = await fetchPageSnapshot(url);
  const dashboard = await fetchDashboardConfigById(dashboardId);
  return {
    dashboard,
    analysis: analyzer.analyze(snapshot, dashboard),
  };
}

export async function loadDashboards() {
  return fetchDashboardConfigs();
}
