import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  const quota = await DataService.getStorageQuota();
  return NextResponse.json(quota);
}

export async function POST(request: Request) {
  try {
    const { sizeBytes } = await request.json();
    if (!sizeBytes) {
      return NextResponse.json({ error: "Missing sizeBytes" }, { status: 400 });
    }
    const result = await DataService.uploadFileSimulation(parseInt(sizeBytes));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: "Upload failed" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { bytesToAdd } = await request.json();
    if (!bytesToAdd) {
      return NextResponse.json({ error: "Missing bytesToAdd" }, { status: 400 });
    }
    const updated = await DataService.upgradeStorageQuota(parseInt(bytesToAdd));
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Upgrade failed" }, { status: 400 });
  }
}
