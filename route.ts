import { NextResponse } from "next/server";
import { classCodeValid, teacherAuthorized } from "@/lib/server-auth";
import { clearLevel2Answers, deleteLevel2Answer, listLevel2Answers, saveLevel2Answers } from "@/lib/records";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const team = Number(new URL(request.url).searchParams.get("team"));
  return NextResponse.json({ answers: listLevel2Answers(team) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !classCodeValid(body.classCode)) {
    return NextResponse.json({ error: "Class code not accepted." }, { status: 401 });
  }
  const teamId = Number(body.teamId);
  const studentCode = String(body.studentCode ?? "");
  const kind = String(body.kind ?? "");
  if (
    !Number.isInteger(teamId) || teamId < 1 || teamId > 30 ||
    !studentCode || studentCode.length > 40 ||
    (kind !== "temperature" && kind !== "density")
  ) {
    return NextResponse.json({ error: "Check Team, Student or investigation." }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || body.answers.length > 3 ||
      body.answers.some((a) => typeof a !== "string" || a.length > 4000)) {
    return NextResponse.json({ error: "Check answer format." }, { status: 400 });
  }
  const record = saveLevel2Answers({
    classCode: String(body.classCode).trim().toUpperCase(),
    teamId,
    studentCode,
    kind,
    answers: body.answers as string[],
  });
  return NextResponse.json({ ok: true, answer: record }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all") === "1";
  const team = Number(url.searchParams.get("team"));
  if (id) {
    deleteLevel2Answer(id);
    return NextResponse.json({ ok: true });
  }
  if (!all && !(Number.isInteger(team) && team > 0)) {
    return NextResponse.json({ error: "Supply id, all=1 or a valid team." }, { status: 400 });
  }
  clearLevel2Answers(all ? 0 : team);
  return NextResponse.json({ ok: true });
}
