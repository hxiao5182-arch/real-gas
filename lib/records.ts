import { getDb } from "@/db";

export type SubmissionRow = {
  id: string;
  teamId: number;
  studentCode: string;
  temperature: number;
  pressure: number;
  z: number;
  deviation: number;
  createdAt: number;
};

export type Control = { collecting: boolean; frozen: boolean; updatedAt: number };

type RawRow = {
  id: string;
  team_id: number;
  student_code: string;
  temperature: number;
  pressure: number;
  z: number;
  deviation: number;
  created_at: number;
};

function toSubmission(row: RawRow): SubmissionRow {
  return {
    id: row.id,
    teamId: row.team_id,
    studentCode: row.student_code,
    temperature: row.temperature,
    pressure: row.pressure,
    z: row.z,
    deviation: row.deviation,
    createdAt: row.created_at,
  };
}

export function controlState(): Control {
  const db = getDb();
  const row = db
    .prepare("SELECT collecting, frozen, updated_at FROM class_control WHERE id = 1")
    .get() as { collecting: number; frozen: number; updated_at: number } | undefined;
  if (!row) return { collecting: true, frozen: false, updatedAt: Date.now() };
  return {
    collecting: Boolean(row.collecting),
    frozen: Boolean(row.frozen),
    updatedAt: row.updated_at,
  };
}

export function patchControl(update: { collecting?: boolean; frozen?: boolean }) {
  const db = getDb();
  const current = controlState();
  const collecting = update.collecting ?? current.collecting;
  const frozen = update.frozen ?? current.frozen;
  db.prepare(
    "INSERT INTO class_control (id, collecting, frozen, updated_at) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET collecting = excluded.collecting, frozen = excluded.frozen, updated_at = excluded.updated_at",
  ).run(collecting ? 1 : 0, frozen ? 1 : 0, Date.now());
  return controlState();
}

export function listSubmissions(team: number): SubmissionRow[] {
  const db = getDb();
  if (Number.isInteger(team) && team > 0) {
    const rows = db
      .prepare("SELECT * FROM submissions WHERE team_id = ? ORDER BY created_at DESC LIMIT 500")
      .all(team) as RawRow[];
    return rows.map(toSubmission);
  }
  const rows = db
    .prepare("SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500")
    .all() as RawRow[];
  return rows.map(toSubmission);
}

export function insertSubmission(row: SubmissionRow) {
  getDb()
    .prepare(
      "INSERT INTO submissions (id, team_id, student_code, temperature, pressure, z, deviation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      row.id,
      row.teamId,
      row.studentCode,
      row.temperature,
      row.pressure,
      row.z,
      row.deviation,
      row.createdAt,
    );
  return row;
}

export function deleteSubmission(id: string) {
  getDb().prepare("DELETE FROM submissions WHERE id = ?").run(id);
}

export type Level2Answer = {
  id: string;
  teamId: number;
  studentCode: string;
  kind: "temperature" | "density";
  answers: string[];
  updatedAt: number;
};

type Level2Raw = {
  id: string;
  class_code: string;
  team_id: number;
  student_code: string;
  kind: string;
  answers: string;
  updated_at: number;
};

function toLevel2(row: Level2Raw): Level2Answer {
  let answers: string[] = [];
  try {
    const parsed = JSON.parse(row.answers) as unknown;
    if (Array.isArray(parsed)) answers = parsed.map((v) => String(v ?? ""));
  } catch {
    answers = [];
  }
  return {
    id: row.id,
    teamId: row.team_id,
    studentCode: row.student_code,
    kind: row.kind === "density" ? "density" : "temperature",
    answers,
    updatedAt: row.updated_at,
  };
}

export function saveLevel2Answers(input: {
  classCode: string;
  teamId: number;
  studentCode: string;
  kind: "temperature" | "density";
  answers: string[];
}): Level2Answer {
  const id = `${input.classCode}:${input.teamId}:${input.studentCode}:${input.kind}`;
  const updatedAt = Date.now();
  const answers = JSON.stringify(input.answers);
  getDb()
    .prepare(
      "INSERT INTO level2_answers (id, class_code, team_id, student_code, kind, answers, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET answers = excluded.answers, updated_at = excluded.updated_at",
    )
    .run(id, input.classCode, input.teamId, input.studentCode, input.kind, answers, updatedAt);
  return {
    id,
    teamId: input.teamId,
    studentCode: input.studentCode,
    kind: input.kind,
    answers: input.answers,
    updatedAt,
  };
}

export function listLevel2Answers(team: number): Level2Answer[] {
  const db = getDb();
  const rows = Number.isInteger(team) && team > 0
    ? db.prepare("SELECT * FROM level2_answers WHERE team_id = ? ORDER BY updated_at DESC").all(team) as Level2Raw[]
    : db.prepare("SELECT * FROM level2_answers ORDER BY updated_at DESC").all() as Level2Raw[];
  return rows.map(toLevel2);
}
