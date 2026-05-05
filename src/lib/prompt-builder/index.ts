import { AnalysisResult, DashboardConfig } from "@/lib/types";

function stripNumberPrefix(value: string) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function formatMetricLine(item: AnalysisResult["criterionScores"][number], dashboard: DashboardConfig) {
  const criterion = dashboard.criteria.find((entry) => entry.id === item.id);
  const why = criterion?.description ? ` Why it matters: ${criterion.description}` : "";
  return `- ${item.label} — ${item.score}/100. Evidence: ${item.summary}${why}`;
}

export function buildImprovementPrompt({
  sourceUrl,
  dashboard,
  analysis,
}: {
  sourceUrl: string;
  dashboard: DashboardConfig;
  analysis: AnalysisResult;
}) {
  const weakestMetrics = [...analysis.criterionScores]
    .sort((left, right) => left.score - right.score)
    .slice(0, 4);
  const metricLines = weakestMetrics.map((item) => formatMetricLine(item, dashboard)).join("\n");
  const recommendations = analysis.recommendations.slice(0, 4).map((item) => `- ${item}`).join("\n");
  const priorityActions = analysis.priorityImprovements
    .slice(0, 3)
    .map((item) => `- ${stripNumberPrefix(item)}`)
    .join("\n");
  const weakPoints = analysis.mainWeakPoints.slice(0, 4).join(", ");

  return [
    `Improve this landing page: ${sourceUrl}`,
    "",
    `Evaluation framework: ${dashboard.label}`,
    `Current overall score: ${analysis.overallScore}/100`,
    `Primary weak areas: ${weakPoints}`,
    "",
    "Weak metrics to fix first:",
    metricLines,
    "",
    "Required improvements:",
    recommendations,
    "",
    "Priority rebuild actions:",
    priorityActions,
    "",
    "Rewrite brief:",
    `- Rebuild the page around one clear conversion path and use ${dashboard.promptFocus}.`,
    "- Tighten the hero so the promise is understandable in one fast read.",
    "- Keep one primary CTA and repeat it consistently instead of branching into multiple competing next steps.",
    "- Clarify the offer: who it is for, what is included, why it is credible, and what happens next.",
    "- Add or strengthen proof, specifics, and trust signals where they are currently weak.",
    "- Improve section hierarchy, scan flow, and readability without bloating the page.",
    "- Preserve the core offer and useful source material, but rewrite weak copy aggressively if needed.",
    "",
    "Output expectations:",
    "- Produce a cleaner, more persuasive version of the page.",
    "- Make the structure feel deliberate and conversion-focused, not just cosmetically different.",
    "- Use concise copy, stronger section order, and clearer CTA language.",
  ].join("\n");
}
