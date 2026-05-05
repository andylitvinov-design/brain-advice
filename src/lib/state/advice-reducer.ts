import { AdviceAction, AdviceState } from "@/lib/types";

export const initialAdviceState: AdviceState = {
  status: "idle",
  url: "",
  recentUrls: [],
  selectedDashboardId: "",
  analysis: null,
  prompt: "",
  selectedTargetId: "generate-online-preview",
  runResult: null,
  error: null,
};

export function adviceReducer(state: AdviceState, action: AdviceAction): AdviceState {
  switch (action.type) {
    case "set_url":
      return { ...state, url: action.value, error: null };
    case "set_recent_urls":
      return { ...state, recentUrls: action.value.slice(0, 4) };
    case "use_recent_url":
      return { ...state, url: action.value, error: null };
    case "set_dashboard":
      return { ...state, selectedDashboardId: action.value, error: null };
    case "start_analyze":
      return { ...state, status: "analyzing", error: null, runResult: null };
    case "analyze_success":
      return {
        ...state,
        status: "analyzed",
        analysis: action.analysis,
        prompt: action.prompt,
        url: action.url,
        recentUrls: [action.url, ...state.recentUrls.filter((item) => item !== action.url)].slice(0, 4),
        error: null,
      };
    case "analyze_error":
      return { ...state, status: "error", error: action.error };
    case "set_prompt":
      return { ...state, prompt: action.value, status: state.analysis ? "editing_prompt" : state.status, error: null };
    case "set_target":
      return { ...state, selectedTargetId: action.value, error: null };
    case "start_run":
      return { ...state, status: "sending_to_codex", error: null };
    case "run_success":
    case "refresh_success":
      return { ...state, status: "preview_ready", runResult: action.runResult, error: null };
    case "accept_success":
      return { ...state, status: "accepted", runResult: action.runResult, error: null };
    case "run_error":
      return { ...state, status: "error", error: action.error };
    case "clear_error":
      return { ...state, error: null };
    default:
      return state;
  }
}
