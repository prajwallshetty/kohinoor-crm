import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const logs = await DataService.getAuditLogs();
  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  try {
    const { userId, userEmail, action, details } = await request.json();
    await DataService.logAction(userId, userEmail, action, details);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to log action" }, { status: 400 });
  }
}
