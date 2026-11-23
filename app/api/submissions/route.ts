import { NextResponse } from "next/server";
import { gasResult } from "@/lib/real-gas";
import { classCodeValid, teacherAuthorized } from "@/lib/server-auth";
import { controlState, insertSubmission, listSubmissions } from "@/lib/records";
import type { SubmissionRow } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const url = new URL(request.url);
  const team = Number(url.searchParams.get("team"));
  return NextResponse.json({
    submissions: listSubmissions(team),
    control: controlState(),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !classCodeValid(body.classCode)) {
    return NextResponse.json({ error: "Class code not accepted." }, { status: 401 });
  }
  const teamId = Number(body.teamId);
  const studentCode = String(body.studentCode ?? "");
  const temperature = Number(body.temperature);
  const pressure = Number(body.pressure);
  if (
    !Number.isInteger(teamId) || teamId < 1 || teamId > 30 ||
    !studentCode || studentCode.length > 40 ||
    !Number.isFinite(temperature) || temperature < 250 || temperature > 600 ||
    !Number.isFinite(pressure) || pressure < 1 || pressure > 100
  ) {
    return NextResponse.json({ error: "Check Team, Student, T and P values." }, { status: 400 });
  }
  const control = controlState();
  if (!control.collecting) {
    return NextResponse.json(
      { error: "Data collection is paused by your teacher." },
      { status: 423 },
    );
  }
  const result = gasResult(temperature, pressure);
  const row: SubmissionRow = {
    id: crypto.randomUUID(),
    teamId,
    studentCode,
    temperature: Math.round(temperature),
    pressure: Math.round(pressure),
    z: Number(result.z.toFixed(4)),
    deviation: Number(result.deviation.toFixed(2)),
    createdAt: Date.now(),
  };
  insertSubmission(row);
  return NextResponse.json({ ok: true, submission: row }, { status: 201 });
}
