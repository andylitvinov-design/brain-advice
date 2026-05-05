import { CodexClient, CodexGeneration } from "@/lib/codex/client";
import { RunPayload } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toTitle(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Improved page";
  }
}

function buildHtml(payload: RunPayload, iteration: number) {
  const domain = toTitle(payload.sourceUrl);
  const priorities = payload.analysis.priorityImprovements
    .map((item) => `<li>${escapeHtml(item.replace(/^\d+\.\s*/, ""))}</li>`)
    .join("");
  const signals = payload.analysis.criterionScores
    .slice(0, 4)
    .map(
      (item) =>
        `<article class="signal"><span>${escapeHtml(item.label)}</span><strong>${item.score}/100</strong></article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(domain)} — Advice Preview ${iteration}</title>
  <style>
    :root { color-scheme: light; --bg:#f6f1ea; --surface:rgba(255,255,255,0.86); --line:rgba(32,24,16,0.1); --text:#201810; --muted:#6d6055; --accent:#145c56; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:"Avenir Next","Segoe UI",sans-serif; color:var(--text); background:linear-gradient(180deg,#f0e7db 0%, var(--bg) 100%); }
    .shell { width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:28px 0 72px; }
    .hero { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(280px,0.8fr); gap:24px; padding:32px; background:var(--surface); border:1px solid var(--line); border-radius:28px; box-shadow:0 24px 80px rgba(73,54,37,0.12); }
    .eyebrow { display:inline-block; padding:8px 12px; border-radius:999px; background:rgba(20,92,86,0.12); color:var(--accent); font-size:12px; letter-spacing:0.12em; text-transform:uppercase; }
    h1 { margin:18px 0 12px; font-family:Georgia,serif; font-size:clamp(2.2rem,6vw,4.8rem); line-height:0.94; letter-spacing:-0.05em; }
    p { color:var(--muted); line-height:1.6; }
    .cta-row { display:flex; gap:12px; margin-top:22px; flex-wrap:wrap; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:0 18px; border-radius:999px; border:1px solid transparent; font-weight:700; }
    .button-primary { background:var(--accent); color:white; }
    .button-secondary { border-color:var(--line); background:white; color:var(--text); }
    .panel { padding:24px; border-radius:24px; border:1px solid var(--line); background:rgba(255,251,246,0.92); }
    .signal-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; margin:0 0 20px; }
    .signal { padding:16px; border-radius:18px; background:white; border:1px solid var(--line); }
    .signal span { display:block; color:var(--muted); font-size:14px; margin-bottom:8px; }
    .signal strong { font-size:1.4rem; }
    .content { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,0.9fr); gap:24px; margin-top:24px; }
    ul { margin:14px 0 0; padding-left:18px; color:var(--text); }
    li { margin:10px 0; }
    .footer-note { margin-top:24px; font-size:14px; }
    @media (max-width: 860px) { .hero, .content { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <span class="eyebrow">Advice Preview • Iteration ${iteration}</span>
        <h1>${escapeHtml(domain)} rebuilt for clearer action.</h1>
        <p>This mock Codex output turns the selected audit into a tighter first screen, a clearer offer, stronger CTA language, and a more readable section flow.</p>
        <div class="cta-row">
          <a class="button button-primary" href="#">Book a focused review</a>
          <a class="button button-secondary" href="#">See what is included</a>
        </div>
        <p class="footer-note">Source page: ${escapeHtml(payload.sourceUrl)}</p>
      </div>
      <aside class="panel">
        <div class="signal-grid">${signals}</div>
        <p><strong>Prompt direction:</strong> ${escapeHtml(payload.prompt)}</p>
      </aside>
    </section>
    <section class="content">
      <article class="panel">
        <span class="eyebrow">What changed</span>
        <h2>Priority improvements</h2>
        <ul>${priorities}</ul>
      </article>
      <article class="panel">
        <span class="eyebrow">Offer frame</span>
        <h2>One cleaner decision path</h2>
        <p>Use one main headline, one main CTA, explicit proof, and a direct explanation of what the visitor gets next. Remove weak branching and compress the message into fewer, sharper sections.</p>
      </article>
    </section>
  </main>
</body>
</html>`;
}

export class MockCodexClient implements CodexClient {
  async sendRun(payload: RunPayload): Promise<CodexGeneration> {
    if (payload.target.endpointMode === "new-thread") {
      throw new Error("Local Codex thread mode is not enabled for this Advice build.");
    }

    return {
      generatedHtml: buildHtml(payload, 1),
      summary: `Preview generated for ${payload.target.label} in mock mode.`,
    };
  }

  async refreshRun(_runId: string, payload: RunPayload, iteration: number) {
    return {
      generatedHtml: buildHtml(payload, iteration),
      summary: `Preview regenerated, iteration ${iteration}.`,
    };
  }

  async acceptRun(runId: string) {
    void runId;
    return { ok: true as const };
  }
}
