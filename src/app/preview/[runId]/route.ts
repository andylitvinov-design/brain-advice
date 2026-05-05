import { readPreviewHtml } from "@/lib/preview/provider";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    const { record, html } = await readPreviewHtml(runId);

    if (new Date(record.expiresAt).getTime() < Date.now() && record.deploymentState !== "accepted_final") {
      return new Response(
        `<!doctype html><html><body style="font-family: sans-serif; padding: 32px;"><h1>Preview expired</h1><p>This temporary preview lived for one hour and is no longer available.</p></body></html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 410 },
      );
    }

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response(
      `<!doctype html><html><body style="font-family: sans-serif; padding: 32px;"><h1>Preview not found</h1></body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" }, status: 404 },
    );
  }
}
