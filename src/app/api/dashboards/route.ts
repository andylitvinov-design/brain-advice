import { NextResponse } from "next/server";
import { loadDashboards } from "@/lib/server";

export async function GET() {
  try {
    const dashboards = await loadDashboards();
    return NextResponse.json({ dashboards });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboards." },
      { status: 500 },
    );
  }
}
