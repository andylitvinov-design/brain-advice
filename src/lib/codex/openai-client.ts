import { CodexClient, CodexGeneration } from "@/lib/codex/client";
import { RunPayload } from "@/lib/types";

type OpenAIResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Online generation is not configured yet. Add OPENAI_API_KEY to the server environment.");
  }

  return apiKey;
}

function getModel() {
  return process.env.ADVICE_OPENAI_MODEL || "gpt-5.4-mini";
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function buildGenerationInstructions() {
  return [
    "You are a senior landing page designer and front-end builder.",
    "Return only a complete standalone HTML document with inline CSS and no markdown fences.",
    "Create a polished, modern, desktop-first but mobile-responsive marketing page.",
    "Use the audit findings and prompt as hard requirements, not vague inspiration.",
    "Keep one clear primary CTA, stronger hierarchy, clearer offer framing, and stronger trust proof.",
    "Do not output explanations, only the final HTML.",
  ].join(" ");
}

function buildGenerationInput(payload: RunPayload, iteration: number) {
  return [
    `Source URL: ${payload.sourceUrl}`,
    `Preview iteration: ${iteration}`,
    `Overall score: ${payload.analysis.overallScore}/100`,
    "",
    "Weak points:",
    payload.analysis.mainWeakPoints.map((item) => `- ${item}`).join("\n"),
    "",
    "Metric evidence:",
    payload.analysis.criterionScores.map((item) => `- ${item.label}: ${item.score}/100. ${item.summary}`).join("\n"),
    "",
    "Recommendations:",
    payload.analysis.recommendations.map((item) => `- ${item}`).join("\n"),
    "",
    "Improve first:",
    payload.analysis.priorityImprovements.map((item) => `- ${item.replace(/^\d+\.\s*/, "")}`).join("\n"),
    "",
    "Implementation prompt:",
    payload.prompt,
    "",
    "Build the improved page now.",
  ].join("\n");
}

async function requestGeneratedHtml(payload: RunPayload, iteration: number) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: getModel(),
      instructions: buildGenerationInstructions(),
      input: buildGenerationInput(payload, iteration),
      text: { format: { type: "text" } },
      max_output_tokens: 5000,
    }),
  });

  const data = (await response.json()) as OpenAIResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI generation failed with status ${response.status}.`);
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text" && typeof content.text === "string")?.text;

  if (!outputText) {
    throw new Error("OpenAI generation returned no HTML output.");
  }

  return stripCodeFence(outputText);
}

export class OpenAICodexClient implements CodexClient {
  async sendRun(payload: RunPayload): Promise<CodexGeneration> {
    const generatedHtml = await requestGeneratedHtml(payload, 1);

    return {
      generatedHtml,
      summary: "Improved page generated online from the prompt and published as a temporary preview.",
    };
  }

  async refreshRun(_runId: string, payload: RunPayload, iteration: number): Promise<CodexGeneration> {
    const generatedHtml = await requestGeneratedHtml(payload, iteration);

    return {
      generatedHtml,
      summary: `Improved page regenerated online, iteration ${iteration}.`,
    };
  }

  async acceptRun(runId: string) {
    void runId;
    return { ok: true as const };
  }
}
