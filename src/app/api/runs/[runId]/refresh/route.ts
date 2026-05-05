import { NextResponse } from "next/server";
import { readRunRecord, refreshPreview } from "@/lib/preview/provider";
import { codexClient } from "@/lib/server";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    const record = await readRunRecord(runId);
    const nextIteration = record.currentIteration + 1;

    const generation = await codexClient.refreshRun(
      runId,
      {
        sourceUrl: record.sourceUrl,
        dashboardId: record.dashboardId,
        analysis: record.analysis,
        prompt: record.prompt,
        target: record.target,
      },
      nextIteration,
    );

    const runResult = await refreshPreview({
      runId,
      generatedHtml: generation.generatedHtml,
      summary: generation.summary,
    });

    return NextResponse.json({ runResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed." },
      { status: 500 },
    );
  }
}
