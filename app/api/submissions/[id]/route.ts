import { NextResponse } from "next/server";
import { teacherAuthorized } from "@/lib/server-auth";
import { deleteSubmission } from "@/lib/records";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!teacherAuthorized(request)) {
    return NextResponse.json({ error: "Instructor code not accepted." }, { status: 401 });
  }
  const { id } = await context.params;
  deleteSubmission(id);
  return NextResponse.json({ ok: true });
}
