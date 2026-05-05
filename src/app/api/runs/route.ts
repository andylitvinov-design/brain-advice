import { NextResponse } from "next/server";
import { createPreview } from "@/lib/preview/provider";
import { codexClient } from "@/lib/server";
import { RunPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RunPayload;

    if (!payload?.sourceUrl || !payload?.prompt || !payload?.target?.id) {
      return NextResponse.json({ error: "Incomplete run payload." }, { status: 400 });
    }

    const generation = await codexClient.sendRun(payload);
    const runResult = await createPreview({
      payload,
      generatedHtml: generation.generatedHtml,
      summary: generation.summary,
      codexThreadId: generation.codexThreadId,
      codexThreadName: generation.codexThreadName,
      codexTurnId: generation.codexTurnId,
    });

    return NextResponse.json({ runResult });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed." },
      { status: 500 },
    );
  }
}
