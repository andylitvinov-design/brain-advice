import { RunPayload } from "@/lib/types";

export type CodexGeneration = {
  generatedHtml: string;
  summary: string;
  codexThreadId?: string;
  codexThreadName?: string;
  codexTurnId?: string;
};

export interface CodexClient {
  sendRun(payload: RunPayload): Promise<CodexGeneration>;
  refreshRun(runId: string, payload: RunPayload, iteration: number): Promise<CodexGeneration>;
  acceptRun(runId: string): Promise<{ ok: true }>;
}
