"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { getCodexTarget } from "@/lib/codex/targets";
import { adviceReducer, initialAdviceState } from "@/lib/state/advice-reducer";
import { AdviceStatus, AnalysisResult, DashboardConfig, RunResult } from "@/lib/types";

function statusLabel(status: AdviceStatus) {
  return (
    {
      idle: "Idle",
      analyzing: "Analyzing",
      analyzed: "Analyzed",
      editing_prompt: "Editing prompt",
      sending_to_codex: "Sending to Codex",
      generating_preview: "Generating preview",
      preview_ready: "Preview ready",
      accepted: "Accepted",
      error: "Error",
    }[status] ?? status
  );
}

function statusTone(status: AdviceStatus) {
  if (status === "error") return "bad";
  if (status === "accepted") return "ok";
  if (status === "preview_ready" || status === "analyzed" || status === "editing_prompt") return "warm";
  return "default";
}

function minutesLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 60000));
}

function AnalysisPanel({ analysis }: { analysis: AnalysisResult | null }) {
  if (!analysis) {
    return (
      <section className="panel panel-muted">
        <div className="panel-head">
          <span className="eyebrow">Analysis</span>
          <h2>No analysis yet</h2>
        </div>
        <p className="muted">Run a URL through one dashboard to see scoring, weak points, and improvement priorities.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head split">
        <div>
          <span className="eyebrow">Analysis</span>
          <h2>Overall score: {analysis.overallScore}/100</h2>
        </div>
        <div className="score-pill">{analysis.sourceSnapshot.pageUrl}</div>
      </div>
      <div className="analysis-layout">
        <div className="analysis-left">
          <div className="metrics-grid">
            {analysis.criterionScores.map((item) => (
              <article key={item.id} className="metric-card">
                <span>{item.label}</span>
                <strong>{item.score}/100</strong>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
          <article className="analysis-section">
            <h3>Main weak points</h3>
            <ul className="list">
              {analysis.mainWeakPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="analysis-right">
          <article className="analysis-section">
            <h3>Recommendations</h3>
            <ol className="list">
              {analysis.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
          <article className="analysis-section analysis-priority">
            <h3>Improve first</h3>
            <ol className="list">
              {analysis.priorityImprovements.map((item) => (
                <li key={item}>{item.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
          </article>
        </div>
      </div>
    </section>
  );
}

function PreviewPanel({
  runResult,
  onRefresh,
  onAccept,
  pending,
}: {
  runResult: RunResult | null;
  onRefresh: () => void;
  onAccept: () => void;
  pending: boolean;
}) {
  if (!runResult) {
    return (
      <section className="panel panel-muted">
        <div className="panel-head">
          <span className="eyebrow">Preview</span>
          <h2>No preview yet</h2>
        </div>
        <p className="muted">After Run, Advice creates a real preview link with a 1-hour lifetime.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head split">
        <div>
          <span className="eyebrow">Preview result</span>
          <h2>{runResult.deploymentState === "accepted_final" ? "Final page locked" : "Temporary preview ready"}</h2>
        </div>
        <div className="status-cluster">
          <span className={`status-badge tone-${statusTone(runResult.status)}`}>{statusLabel(runResult.status)}</span>
          <span className="status-badge tone-default">Iteration {runResult.iteration}</span>
        </div>
      </div>
      <div className="preview-links">
        <a className="link-card" href={runResult.previewUrl} target="_blank" rel="noreferrer">
          <span>Preview URL</span>
          <strong>{runResult.previewUrl}</strong>
          <p>{runResult.summary}</p>
        </a>
        <div className="link-card">
          <span>Lifetime</span>
          <strong>
            {runResult.deploymentState === "accepted_final" ? "Final page is fixed" : `${minutesLeft(runResult.expiresAt)} min left`}
          </strong>
          <p>
            {runResult.deploymentState === "accepted_final"
              ? runResult.finalUrl
              : "Temporary preview stays live for 1 hour unless accepted earlier."}
          </p>
        </div>
      </div>
      {runResult.finalUrl ? (
        <a className="button button-secondary final-link" href={runResult.finalUrl} target="_blank" rel="noreferrer">
          Open final URL
        </a>
      ) : null}
      {runResult.codexThreadName ? (
        <div className="dashboard-note">
          <strong>Codex chat created</strong>
          <p>{runResult.codexThreadName}</p>
          <p>Thread id: {runResult.codexThreadId}</p>
        </div>
      ) : null}
      <div className="action-row">
        <button className="button button-secondary" type="button" onClick={onRefresh} disabled={pending}>
          Refresh
        </button>
        <button className="button button-primary" type="button" onClick={onAccept} disabled={pending}>
          Accepted
        </button>
      </div>
    </section>
  );
}

export function AdviceApp() {
  const [state, dispatch] = useReducer(adviceReducer, initialAdviceState);
  const [requestPending, setRequestPending] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const selectedDashboard = useMemo(
    () => dashboards.find((item) => item.id === state.selectedDashboardId) ?? dashboards[0] ?? null,
    [dashboards, state.selectedDashboardId],
  );
  const selectedTarget = useMemo(() => getCodexTarget(state.selectedTargetId), [state.selectedTargetId]);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardOptions() {
      try {
        const response = await fetch("/api/dashboards", { cache: "no-store" });
        const data = (await response.json()) as { dashboards?: DashboardConfig[]; error?: string };

        if (!response.ok || !Array.isArray(data.dashboards) || data.dashboards.length === 0) {
          throw new Error(data.error || "No live dashboard metrics found.");
        }

        if (ignore) {
          return;
        }

        setDashboards(data.dashboards);
        setDashboardError(null);

        if (!state.selectedDashboardId) {
          dispatch({ type: "set_dashboard", value: data.dashboards[0].id });
        }
      } catch (error) {
        if (!ignore) {
          setDashboardError(error instanceof Error ? error.message : "Failed to load dashboard metrics.");
        }
      }
    }

    void loadDashboardOptions();

    return () => {
      ignore = true;
    };
  }, [state.selectedDashboardId]);

  useEffect(() => {
    const raw = window.localStorage.getItem("advice-recent-urls");

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        dispatch({ type: "set_recent_urls", value: parsed });
      }
    } catch {
      window.localStorage.removeItem("advice-recent-urls");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("advice-recent-urls", JSON.stringify(state.recentUrls));
  }, [state.recentUrls]);

  async function handleAnalyze() {
    if (!state.url.trim()) {
      dispatch({ type: "analyze_error", error: "Enter a page URL first." });
      return;
    }

    dispatch({ type: "start_analyze" });
    setRequestPending(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: state.url, dashboardId: state.selectedDashboardId }),
      });
      const data = (await response.json()) as {
        analysis?: AnalysisResult;
        prompt?: string;
        normalizedUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.analysis || !data.prompt || !data.normalizedUrl) {
        throw new Error(data.error || "Analyze failed.");
      }

      dispatch({ type: "analyze_success", analysis: data.analysis, prompt: data.prompt, url: data.normalizedUrl });
    } catch (error) {
      dispatch({ type: "analyze_error", error: error instanceof Error ? error.message : "Analyze failed." });
    } finally {
      setRequestPending(false);
    }
  }

  async function handleRun() {
    if (!state.analysis || !state.prompt.trim()) {
      dispatch({ type: "run_error", error: "Analyze the page and confirm the prompt first." });
      return;
    }

    if (!selectedTarget) {
      dispatch({ type: "run_error", error: "Choose a real Codex destination first." });
      return;
    }

    dispatch({ type: "start_run" });
    setRequestPending(true);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: state.url,
          dashboardId: state.selectedDashboardId,
          analysis: state.analysis,
          prompt: state.prompt,
          target: selectedTarget,
        }),
      });
      const data = (await response.json()) as { runResult?: RunResult; error?: string };

      if (!response.ok || !data.runResult) {
        throw new Error(data.error || "Run failed.");
      }

      dispatch({ type: "run_success", runResult: data.runResult });
    } catch (error) {
      dispatch({ type: "run_error", error: error instanceof Error ? error.message : "Run failed." });
    } finally {
      setRequestPending(false);
    }
  }

  async function handleRefresh() {
    if (!state.runResult) return;
    dispatch({ type: "start_run" });
    setRequestPending(true);

    try {
      const response = await fetch(`/api/runs/${state.runResult.runId}/refresh`, { method: "POST" });
      const data = (await response.json()) as { runResult?: RunResult; error?: string };

      if (!response.ok || !data.runResult) {
        throw new Error(data.error || "Refresh failed.");
      }

      dispatch({ type: "refresh_success", runResult: data.runResult });
    } catch (error) {
      dispatch({ type: "run_error", error: error instanceof Error ? error.message : "Refresh failed." });
    } finally {
      setRequestPending(false);
    }
  }

  async function handleAccept() {
    if (!state.runResult) return;
    dispatch({ type: "start_run" });
    setRequestPending(true);

    try {
      const response = await fetch(`/api/runs/${state.runResult.runId}/accept`, { method: "POST" });
      const data = (await response.json()) as { runResult?: RunResult; error?: string };

      if (!response.ok || !data.runResult) {
        throw new Error(data.error || "Accept failed.");
      }

      dispatch({ type: "accept_success", runResult: data.runResult });
    } catch (error) {
      dispatch({ type: "run_error", error: error instanceof Error ? error.message : "Accept failed." });
    } finally {
      setRequestPending(false);
    }
  }

  async function handleCopyPrompt() {
    if (!state.prompt) return;
    await navigator.clipboard.writeText(state.prompt);
  }

  return (
    <main className="shell">
      <div className="top-link-row">
        <a className="top-projects-link" href="https://codex-links.pages.dev/projects" target="_blank" rel="noreferrer">
          Open Codex projects
        </a>
      </div>
      <section className="hero-shell">
        <div className="hero-copy">
          <span className="eyebrow">Advice</span>
          <h1>Audit a page, shape the prompt, ship a better preview.</h1>
          <p>Advice keeps the loop narrow: page URL in, dashboard-based analysis, editable Codex prompt, preview out.</p>
        </div>
        <div className="hero-status">
          <span className={`status-badge tone-${statusTone(state.status)}`}>{statusLabel(state.status)}</span>
          <p>{selectedDashboard?.description ?? "Loading live dashboard metric source."}</p>
        </div>
      </section>

      <div className="workspace">
        <section className="panel">
          <div className="panel-head">
            <span className="eyebrow">1. Analyze</span>
            <h2>Source page and dashboard</h2>
          </div>
          <div className="inline-row">
            <label className="field grow">
              <span className="field-label">Page URL</span>
              <input
                value={state.url}
                onChange={(event) => dispatch({ type: "set_url", value: event.target.value })}
                placeholder="https://example.com/landing-page"
              />
            </label>
            <button
              className="button button-primary top-button"
              type="button"
              onClick={handleAnalyze}
              disabled={requestPending || !selectedDashboard}
            >
              Analyze
            </button>
          </div>
          {state.recentUrls.length > 0 ? (
            <div className="recent-row">
              <span className="field-label">Recent</span>
              <div className="recent-list">
                {state.recentUrls.map((url) => (
                  <button key={url} type="button" className="chip-button" onClick={() => dispatch({ type: "use_recent_url", value: url })}>
                    {url}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="field">
            <span className="field-label">Dashboard metric</span>
            <select
              value={state.selectedDashboardId}
              onChange={(event) => dispatch({ type: "set_dashboard", value: event.target.value as typeof state.selectedDashboardId })}
              disabled={dashboards.length === 0}
            >
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.label}
                </option>
              ))}
            </select>
          </label>
          {selectedDashboard ? (
            <div className="dashboard-note">
              <strong>{selectedDashboard.label}</strong>
              <p>{selectedDashboard.description}</p>
              <p>
                Source:{" "}
                {selectedDashboard.sourceUrl ? (
                  <a href={selectedDashboard.sourceUrl} target="_blank" rel="noreferrer">
                    {selectedDashboard.sourceUrl}
                  </a>
                ) : (
                  "unknown"
                )}
              </p>
              {selectedDashboard.generatedAt ? <p>Snapshot: {new Date(selectedDashboard.generatedAt).toLocaleString()}</p> : null}
            </div>
          ) : null}
        </section>

        <AnalysisPanel analysis={state.analysis} />

        <section className="panel">
          <div className="panel-head split">
            <div>
              <span className="eyebrow">2. Prompt for improvement</span>
              <h2>Editable working prompt</h2>
            </div>
            <button className="button button-secondary" type="button" onClick={handleCopyPrompt} disabled={!state.prompt}>
              Copy prompt
            </button>
          </div>
          <label className="field">
            <span className="field-label">Prompt</span>
            <textarea
              rows={7}
              value={state.prompt}
              onChange={(event) => dispatch({ type: "set_prompt", value: event.target.value })}
              placeholder="Advice will generate a short Codex-ready prompt here."
            />
          </label>
        </section>

        <section className="panel">
          <div className="panel-head">
            <span className="eyebrow">3. Target and run</span>
            <h2>Generate the improved preview page</h2>
          </div>
          <div className="target-summary">
            <div className="target-summary-copy">
              <span className="target-summary-label">Generation target</span>
              <strong>{selectedTarget.label}</strong>
              <p>{selectedTarget.description}</p>
              <p>This run uses the current analysis and prompt to generate a new page version and publish it on a temporary preview URL.</p>
            </div>
            <span className="target-summary-meta">{selectedTarget.category}</span>
          </div>
          <div className="run-strip">
            <div>
              <strong>Run the command</strong>
              <p>Advice will generate the page from the prompt, publish the preview, and place the preview link in the block below.</p>
            </div>
            <button
              className="button button-primary top-button"
              type="button"
              onClick={handleRun}
              disabled={requestPending || !state.analysis || !state.prompt.trim() || !selectedDashboard}
            >
              Run
            </button>
          </div>
        </section>

        <PreviewPanel runResult={state.runResult} onRefresh={handleRefresh} onAccept={handleAccept} pending={requestPending} />
      </div>

      {dashboardError ? <div className="error-banner">{dashboardError}</div> : null}
      {state.error ? <div className="error-banner">{state.error}</div> : null}
    </main>
  );
}
