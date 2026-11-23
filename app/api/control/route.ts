import { NextResponse } from "next/server";
import { publicClassCode, teacherAuthorized } from "@/lib/server-auth";
import { patchControl } from "@/lib/records";

export async function GET() {
  return NextResponse.json({ classCode: publicClassCode() });
}

export async function PATCH(request: Request) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const update: { collecting?: boolean; frozen?: boolean } = {};
  if (typeof body?.collecting === "boolean") update.collecting = body.collecting;
  if (typeof body?.frozen === "boolean") update.frozen = body.frozen;
  if (update.collecting === undefined && update.frozen === undefined) {
    return NextResponse.json({ error: "No control value supplied." }, { status: 400 });
  }
  patchControl(update);
  return NextResponse.json({ ok: true });
}
