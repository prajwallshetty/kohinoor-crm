import { NextResponse } from "next/server";
import { DataService } from "@/lib/data-service";

export async function GET() {
  try {
    const measurements = await DataService.getMeasurements();
    return NextResponse.json(measurements);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const measurement = await DataService.addMeasurement(body);
    return NextResponse.json(measurement);
  } catch (e) {
    return NextResponse.json({ error: "Failed to save measurement" }, { status: 400 });
  }
}
