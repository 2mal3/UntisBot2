import { Database } from "bun:sqlite";
import { WebAPITimetable, WebUntis } from "webuntis";
import { log } from "logging";
import { Lesson, User } from "types";
import { v4 as uuid4 } from "uuid";

const db = new Database("database/database.db");

export async function user_login(
  username: string,
  password: string,
  school_name: string,
  discord_user_id: string
): Promise<{ success: boolean; message: any }> {
  if (
    db.query("SELECT * FROM users WHERE untis_username = $untis_username").all({
      $untis_username: username,
    }).length === 1
  ) {
    return { success: false, message: "Already logged in" };
  }

  const school = await get_school_from_name(school_name);
  log.debug(`School name is ${school.school_name}`);
  const untis = new WebUntis(
    school.school_name,
    username,
    password,
    school.untis_server
  );

  // Check if the credentials are correct
  try {
    await untis.login();
    await untis.logout();
  } catch (error) {
    const error_message = (error as Error).message;
    return { success: false, message: error_message };
  }

  db.query(
    "INSERT INTO users (id, untis_username, untis_password, untis_school_name, untis_server, timetable, discord_user_id) VALUES ($id, $untis_username, $untis_password, $untis_school_name, $untis_server, $timetable, $discord_user_id)"
  ).run({
    $id: uuid4(),
    $untis_username: username,
    $untis_password: password,
    $untis_school_name: school.school_name,
    $untis_server: school.untis_server,
    $timetable: "[]",
    $discord_user_id: discord_user_id,
  });

  return { success: true, message: "" };
}

// Get the untis internal school name and the server url
// from the school search on the webuntis website
export async function get_school_from_name(
  name: string
): Promise<{ school_name: string; untis_server: string }> {
  const response = await fetch("https://mobile.webuntis.com/ms/schoolquery2", {
    method: "POST",
    body: JSON.stringify({
      id: "",
      method: "searchSchool",
      params: [
        {
          search: name,
        },
      ],
      jsonrpc: "2.0",
    }),
  });
  const data = await response.json();

  const school_name = data.result.schools[0].loginName;
  const untis_sever = data.result.schools[0].server;

  return { school_name: school_name, untis_server: untis_sever };
}

function create_date_from_untis_date(
  untis_date: number,
  untis_time: number
): Date {
  const untis_date_string = untis_date.toString();

  const year = untis_date_string.slice(0, 4);
  const month = untis_date_string.slice(4, 6);
  const day = untis_date_string.slice(6, 8);
  const hour = Math.floor(untis_time / 100)
    .toString()
    .padStart(2, "0");
  const minute = (untis_time % 100).toString().padStart(2, "0");

  const date_string = `${year}-${month}-${day} ${hour}:${minute}`;
  const date = new Date(date_string);

  return date;
}

async function get_timetable(user: User): Promise<WebAPITimetable[]> {
  const untis = new WebUntis(
    user.untis_school_name,
    user.untis_username,
    user.untis_password,
    user.untis_server
  );

  await untis.login();
  const timetable = await untis.getOwnTimetableForWeek(new Date());
  await untis.logout();

  return timetable;
}

function format_timetable(timetable: WebAPITimetable[]): Lesson[] {
  let nice_timetable: Lesson[] = [];

  for (const lesson of timetable) {
    let nice_lesson: Lesson = {
      id: lesson.id,
      name: lesson.subjects[0].element.longName ?? "missingno",
      date: create_date_from_untis_date(lesson.date, lesson.startTime),
      cancelled: false,
    };
    // Ignore this error, it's a bug in the typings
    if (
      (lesson.is.cancelled ?? false) ||
      lesson.teachers[0].element.name === "---"
    ) {
      nice_lesson.cancelled = true;
    }

    nice_timetable.push(nice_lesson);
  }

  return nice_timetable;
}

// Loops thought the timetable by index and prints out every lesson where the cancelled status has changed
function filter_cancelled_lessons(
  timetable: Lesson[],
  old_timetable: Lesson[]
): Lesson[] {
  let cancelled_lessons: Lesson[] = [];

  for (let i = 0; i < timetable.length; i++) {
    if (timetable[i].cancelled !== old_timetable[i].cancelled) {
      if (timetable[i].cancelled) {
        cancelled_lessons.push(timetable[i]);
      }
    }
  }

  return cancelled_lessons;
}

export async function get_cancelled_lessons(user: User): Promise<Lesson[]> {
  const timetable = await get_timetable(user);

  const nice_timetable = format_timetable(timetable);

  // Create timetable if it doesn't exist
  if (JSON.parse(user.timetable).length === 0) {
    log.debug(`${user.untis_username}: No timetable exists, creating it ...`);

    db.query("UPDATE users SET timetable = $timetable WHERE id = $id").run({
      $timetable: JSON.stringify(nice_timetable),
      $id: user.id,
    });
  }

  const user_quarry = db.query("SELECT * FROM users WHERE id = $id").get({
    $id: user.id,
  }) as User;
  if (!user_quarry) {
    // FIXME: actually handle this error
    return [];
  }
  const old_timetable = JSON.parse(user_quarry.timetable);
  db.query("UPDATE users SET timetable = $timetable WHERE id = $id").run({
    $timetable: JSON.stringify(nice_timetable),
    $id: user.id,
  });

  const cancelled_lessons = filter_cancelled_lessons(
    nice_timetable,
    old_timetable
  );

  return cancelled_lessons;
}
