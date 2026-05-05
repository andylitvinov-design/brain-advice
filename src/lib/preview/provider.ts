import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { StoredRunRecord, RunPayload, RunResult } from "@/lib/types";

const artifactsRoot = path.join(process.cwd(), "artifacts");
const runsRoot = path.join(artifactsRoot, "runs");
const previewsRoot = path.join(artifactsRoot, "previews");
const publishedRoot = path.join(artifactsRoot, "published");

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function ensureDirs() {
  await Promise.all([
    mkdir(artifactsRoot, { recursive: true }),
    mkdir(runsRoot, { recursive: true }),
    mkdir(previewsRoot, { recursive: true }),
    mkdir(publishedRoot, { recursive: true }),
  ]);
}

function runFile(runId: string) {
  return path.join(runsRoot, `${runId}.json`);
}

function previewFile(runId: string, iteration: number) {
  return path.join(previewsRoot, `${runId}-${iteration}.html`);
}

function finalFile(slug: string) {
  return path.join(publishedRoot, `${slug}.html`);
}

function toRunResult(record: StoredRunRecord): RunResult {
  return {
    runId: record.runId,
    status: record.deploymentState === "accepted_final" ? "accepted" : "preview_ready",
    deploymentState: record.deploymentState,
    previewUrl: `/preview/${record.runId}`,
    expiresAt: record.expiresAt,
    finalUrl: record.finalUrl,
    iteration: record.currentIteration,
    summary: record.iterations.at(-1)?.summary ?? "Preview ready.",
    codexThreadId: record.codexThreadId,
    codexThreadName: record.codexThreadName,
    codexTurnId: record.codexTurnId,
  };
}

async function saveRunRecord(record: StoredRunRecord) {
  await ensureDirs();
  await writeFile(runFile(record.runId), JSON.stringify(record, null, 2), "utf8");
}

export async function readRunRecord(runId: string) {
  await ensureDirs();
  return JSON.parse(await readFile(runFile(runId), "utf8")) as StoredRunRecord;
}

export async function createPreview({
  payload,
  generatedHtml,
  summary,
  codexThreadId,
  codexThreadName,
  codexTurnId,
}: {
  payload: RunPayload;
  generatedHtml: string;
  summary: string;
  codexThreadId?: string;
  codexThreadName?: string;
  codexTurnId?: string;
}) {
  const runId = randomId("run");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const htmlFile = previewFile(runId, 1);
  await ensureDirs();
  await writeFile(htmlFile, generatedHtml, "utf8");

  const record: StoredRunRecord = {
    runId,
    sourceUrl: payload.sourceUrl,
    dashboardId: payload.dashboardId,
    analysis: payload.analysis,
    prompt: payload.prompt,
    target: payload.target,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    deploymentState: "temporary_deployed",
    expiresAt,
    currentIteration: 1,
    iterations: [{ iteration: 1, htmlFile, createdAt: now.toISOString(), summary }],
    codexThreadId,
    codexThreadName,
    codexTurnId,
  };

  await saveRunRecord(record);
  return toRunResult(record);
}

export async function refreshPreview({
  runId,
  generatedHtml,
  summary,
}: {
  runId: string;
  generatedHtml: string;
  summary: string;
}) {
  const record = await readRunRecord(runId);
  const nextIteration = record.currentIteration + 1;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const htmlFile = previewFile(runId, nextIteration);
  await writeFile(htmlFile, generatedHtml, "utf8");

  const nextRecord: StoredRunRecord = {
    ...record,
    updatedAt: now.toISOString(),
    expiresAt,
    currentIteration: nextIteration,
    deploymentState: "temporary_deployed",
    iterations: [...record.iterations, { iteration: nextIteration, htmlFile, createdAt: now.toISOString(), summary }],
  };

  await saveRunRecord(nextRecord);
  return toRunResult(nextRecord);
}

export async function acceptPreview(runId: string) {
  const record = await readRunRecord(runId);
  const latest = record.iterations.at(-1);

  if (!latest) {
    throw new Error("Run has no generated preview.");
  }

  const slug = slugify(`${record.sourceUrl}-${record.runId}`);
  const html = await readFile(latest.htmlFile, "utf8");
  await writeFile(finalFile(slug), html, "utf8");

  const nextRecord: StoredRunRecord = {
    ...record,
    deploymentState: "accepted_final",
    updatedAt: new Date().toISOString(),
    finalSlug: slug,
    finalUrl: `/published/${slug}`,
  };

  await saveRunRecord(nextRecord);
  return toRunResult(nextRecord);
}

export async function readPreviewHtml(runId: string) {
  const record = await readRunRecord(runId);
  const latest = record.iterations.at(-1);

  if (!latest) {
    throw new Error("Preview not found.");
  }

  return {
    record,
    html: await readFile(latest.htmlFile, "utf8"),
  };
}

export async function readPublishedHtml(slug: string) {
  await ensureDirs();
  return readFile(finalFile(slug), "utf8");
}
