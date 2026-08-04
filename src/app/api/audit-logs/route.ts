import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const logs = await DataService.getAuditLogs();
    return NextResponse.json(logs.slice(0, 50)); // Return top 50 logs for notifications
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
