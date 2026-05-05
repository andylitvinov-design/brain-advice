import { NextResponse } from "next/server";
import { acceptPreview } from "@/lib/preview/provider";
import { codexClient } from "@/lib/server";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    await codexClient.acceptRun(runId);
    const runResult = await acceptPreview(runId);
    return NextResponse.json({ runResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Accept failed." },
      { status: 500 },
    );
  }
}
