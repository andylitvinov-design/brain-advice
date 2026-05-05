import { NextResponse } from "next/server";
import { buildImprovementPrompt } from "@/lib/prompt-builder";
import { analyzeUrl } from "@/lib/server";
import { DashboardId } from "@/lib/types";
import { normalizeInputUrl } from "@/lib/url";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; dashboardId?: DashboardId };
    const rawUrl = String(body.url || "").trim();
    const dashboardId = body.dashboardId ?? "sales-landing-metric-dashboard";

    const url = normalizeInputUrl(rawUrl);

    const { analysis, dashboard } = await analyzeUrl(url, dashboardId);
    const prompt = buildImprovementPrompt({ sourceUrl: url, dashboard, analysis });

    return NextResponse.json({ analysis, prompt, dashboard, normalizedUrl: url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed." },
      { status: 500 },
    );
  }
}
