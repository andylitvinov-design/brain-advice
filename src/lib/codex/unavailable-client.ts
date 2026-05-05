import { CodexClient, CodexGeneration } from "@/lib/codex/client";
import { RunPayload } from "@/lib/types";

const MESSAGE =
  "Online page generation is not configured yet. Add OPENAI_API_KEY on the server to generate and publish preview pages from the prompt.";

export class UnavailableCodexClient implements CodexClient {
  async sendRun(payload: RunPayload): Promise<CodexGeneration> {
    void payload;
    throw new Error(MESSAGE);
  }

  async refreshRun(runId: string, payload: RunPayload, iteration: number): Promise<CodexGeneration> {
    void runId;
    void payload;
    void iteration;
    throw new Error(MESSAGE);
  }

  async acceptRun(runId: string) {
    void runId;
    return { ok: true as const };
  }
}
