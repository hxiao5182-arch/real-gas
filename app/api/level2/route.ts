import { NextResponse } from "next/server";
import { classCodeValid, teacherAuthorized } from "@/lib/server-auth";
import { deleteLevel2Answer, listLevel2Answers, saveLevel2Answers } from "@/lib/records";

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

/** Teacher-only removal of a single Level 2 response; never bulk-deletes. */
export async function DELETE(request: Request) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "A valid Level 2 record ID is required." }, { status: 400 });
  }
  if (!deleteLevel2Answer(id)) {
    return NextResponse.json({ error: "Level 2 record not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
