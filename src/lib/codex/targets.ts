import { CodexTarget } from "@/lib/types";

export const codexTargets: CodexTarget[] = [
  {
    id: "generate-online-preview",
    label: "Generate improved preview page",
    category: "online preview",
    description: "Generate a new landing page from the prompt, publish it on a temporary preview URL, and show the link below.",
    endpointMode: "api",
  },
];

export function getCodexTarget(id: string) {
  return codexTargets.find((target) => target.id === id) ?? codexTargets[0];
}
