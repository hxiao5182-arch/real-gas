/**
 * Class code + instructor PIN checks. Values come from environment variables
 * (.env for local use, platform secrets when deployed).
 */
const CLASS_CODE = (process.env.CLASS_CODE || "GASLAB4").trim().toUpperCase();
const TEACHER_PIN = (process.env.TEACHER_PIN || "TEACHV4").trim();

export function teacherAuthorized(request: Request) {
  const supplied = request.headers.get("x-teacher-pin") ?? "";
  return Boolean(TEACHER_PIN) && supplied === TEACHER_PIN;
}

export function classCodeValid(value: unknown) {
  return String(value ?? "").trim().toUpperCase() === CLASS_CODE;
}

export function publicClassCode() {
  return CLASS_CODE;
}
