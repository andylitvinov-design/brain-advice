import { DashboardConfig } from "@/lib/types";
import fallbackMetricSnapshot from "@/lib/dashboard-configs/landing-metric-dashboard-snapshot.json";

const LANDING_METRIC_PAGE_URL = "http://127.0.0.1:8877/sales/landing-metric-dashboard.html";
const LANDING_METRIC_DATA_URL = "http://127.0.0.1:8877/sales/reports/landing-metric-dashboard-data.json";
const LIVE_DASHBOARD_ID = "sales-landing-metric-dashboard";

type LandingMetricDataset = {
  generatedAt: string;
  metricModel: Array<{
    id: string;
    label: string;
    weight: number;
    why: string;
  }>;
  summary?: {
    weakestCategory?: {
      id: string;
      label: string;
      average: number;
    };
  };
};

function buildPromptFocus(data: LandingMetricDataset) {
  const weakest = data.summary?.weakestCategory?.label;

  if (weakest) {
    return `focus first on the weakest live dashboard area, especially ${weakest}, while making the page clearer and more conversion-focused`;
  }

  return "focus first on the weakest live dashboard areas while making the page clearer and more conversion-focused";
}

function buildDashboardConfig(data: LandingMetricDataset, mode: "live" | "snapshot"): DashboardConfig {
  const isLive = mode === "live";

  return {
    id: LIVE_DASHBOARD_ID,
    label: "Landing metric dashboard",
    description: isLive
      ? "Live metric source loaded from the sales dashboard at 127.0.0.1:8877."
      : "Snapshot metric source bundled from the sales dashboard because the live 127.0.0.1 source is not reachable from this deployment.",
    promptFocus: buildPromptFocus(data),
    criteria: data.metricModel.map((metric, index) => ({
      id: metric.id,
      label: metric.label,
      description: metric.why,
      priority: index < 4 ? "primary" : "secondary",
      weight: metric.weight,
    })),
    weights: Object.fromEntries(data.metricModel.map((metric) => [metric.id, metric.weight])),
    sourceUrl: LANDING_METRIC_PAGE_URL,
    generatedAt: data.generatedAt,
  };
}

async function loadLiveDashboardDataset() {
  const response = await fetch(LANDING_METRIC_DATA_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(1500),
    headers: {
      "User-Agent": "AdviceMVP/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load dashboard metric source: ${response.status}`);
  }

  return (await response.json()) as LandingMetricDataset;
}

export async function fetchDashboardConfigs(): Promise<DashboardConfig[]> {
  try {
    const liveData = await loadLiveDashboardDataset();
    return [buildDashboardConfig(liveData, "live")];
  } catch {
    return [buildDashboardConfig(fallbackMetricSnapshot as LandingMetricDataset, "snapshot")];
  }
}

export async function fetchDashboardConfigById(id: string) {
  const configs = await fetchDashboardConfigs();
  return configs.find((item) => item.id === id) ?? configs[0];
}
