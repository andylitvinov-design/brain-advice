import { spawn } from "node:child_process";

type RpcClient = {
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
};

type PendingResolver = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function getCodexBin() {
  return process.env.CODEX_BIN || "/Users/andriilitvinov/.npm-global/bin/codex";
}

export function hasLocalCodexCli() {
  return process.env.ADVICE_ENABLE_LOCAL_CODEX === "1" || process.env.NODE_ENV !== "production";
}

async function withCodexAppServer<T>(run: (client: RpcClient) => Promise<T>) {
  const codexBin = getCodexBin();

  if (!hasLocalCodexCli()) {
    throw new Error("Local Codex CLI is not available in this Advice workspace.");
  }

  const child = spawn(codexBin, ["app-server", "--listen", "stdio://"], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let nextId = 1;
  let buffer = "";
  const pending = new Map<number, PendingResolver>();
  let serverError = "";

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;

    while (true) {
      const newlineIndex = buffer.indexOf("\n");

      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      let message: { id?: number; error?: { message?: string }; result?: unknown };

      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }

      if (typeof message.id !== "number") {
        continue;
      }

      const resolver = pending.get(message.id);

      if (!resolver) {
        continue;
      }

      pending.delete(message.id);

      if (message.error) {
        resolver.reject(new Error(message.error.message || "Unknown app-server error."));
      } else {
        resolver.resolve(message.result);
      }
    }
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    serverError += chunk;
  });

  child.on("error", (error) => {
    for (const resolver of pending.values()) {
      resolver.reject(error instanceof Error ? error : new Error("Codex app-server failed to start."));
    }
    pending.clear();
  });

  function request(method: string, params: Record<string, unknown>) {
    const id = nextId++;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(`${payload}\n`);
    });
  }

  try {
    await request("initialize", {
      clientInfo: {
        name: "advice-app",
        title: "Advice App",
        version: "1.0.0",
      },
      capabilities: {
      experimentalApi: true,
      },
    });

    return await run({ request });
  } finally {
    child.kill();

    if (serverError.trim()) {
      console.warn("[advice] codex app-server stderr:", serverError.trim());
    }
  }
}

function sanitizeThreadName(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    return `Advice · ${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return "Advice · New page improvement chat";
  }
}

export async function startAdviceCodexThread(prompt: string, sourceUrl: string) {
  const cwd = process.env.ADVICE_CODEX_CWD || process.cwd();
  const name = sanitizeThreadName(sourceUrl);

  return withCodexAppServer(async ({ request }) => {
    const started = (await request("thread/start", {
      cwd,
      approvalPolicy: "on-request",
      sandbox: "workspace-write",
      experimentalRawEvents: false,
      persistExtendedHistory: true,
    })) as { thread?: { id?: string } };

    const thread = started?.thread;
    const threadId = String(thread?.id || "").trim();

    if (!threadId) {
      throw new Error("Codex app-server did not return a thread id.");
    }

    await request("thread/name/set", {
      threadId,
      name,
    });

    const turn = (await request("turn/start", {
      threadId,
      cwd,
      input: [
        {
          type: "text",
          text: prompt,
          text_elements: [],
        },
      ],
    })) as { turnId?: string };

    return {
      threadId,
      threadName: name,
      turnId: String(turn?.turnId || "").trim(),
    };
  });
}
