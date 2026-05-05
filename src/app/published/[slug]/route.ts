import { readPublishedHtml } from "@/lib/preview/provider";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const html = await readPublishedHtml(slug);
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response(
      `<!doctype html><html><body style="font-family: sans-serif; padding: 32px;"><h1>Published page not found</h1></body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" }, status: 404 },
    );
  }
}
