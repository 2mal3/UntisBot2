import { Database } from "bun:sqlite";
import { log } from "logging";
import { Lesson, User } from "types";
import { get_school_from_name, get_timetable, check_credentials } from "untis";
import { v4 as uuid4 } from "uuid";

export async function user_login(
  db: Database,
  user: User
): Promise<{ success: boolean; message: any }> {
  // Skip if the user is already logged in
  if (
    db.query("SELECT * FROM users WHERE untis_username = $untis_username").all({
      $untis_username: user.untis_username,
    }).length === 1
  ) {
    return { success: false, message: "Already logged in" };
  }

  // Find the internal school name and the server url from the given school name
  try {
    const school = await get_school_from_name(user.untis_school_name);
    user.untis_school_name = school.school_name;
    user.untis_server = school.untis_server;
  } catch (error) {
    return { success: false, message: "No schools found for this school name" };
  }

  log.debug(`School name is ${user.untis_school_name}`);

  // Check if the credentials are correct
  if (!(await check_credentials(user))) {
    return { success: false, message: "Bad credentials" };
  }

  // Add the user to the database
  db.query(
    "INSERT INTO users (id, untis_username, untis_password, untis_school_name, untis_server, timetable, discord_user_id) VALUES ($id, $untis_username, $untis_password, $untis_school_name, $untis_server, $timetable, $discord_user_id)"
  ).run({
    $id: uuid4(),
    $untis_username: user.untis_username,
    $untis_password: user.untis_password,
    $untis_school_name: user.untis_school_name,
    $untis_server: user.untis_server,
    $timetable: "[]",
    $discord_user_id: user.discord_user_id,
  });

  return { success: true, message: "" };
}

// Loops thought the timetable by index and prints out every lesson where the cancelled status has changed
export function filter_cancelled_lessons(
  new_timetable: Lesson[],
  old_timetable: Lesson[]
): Lesson[] {
  let cancelled_lessons: Lesson[] = [];

  for (let i = 0; i < new_timetable.length; i++) {
    if (
      new_timetable[i].date.getTime() === old_timetable[i].date.getTime() &&
      new_timetable[i].cancelled &&
      new_timetable[i].cancelled !== old_timetable[i].cancelled
    ) {
      cancelled_lessons.push(new_timetable[i]);
    }
  }

  return cancelled_lessons;
}

export async function get_cancelled_lessons(
  db: Database,
  user: User
): Promise<Lesson[]> {
  const new_timetable = await get_timetable(user);

  // Create timetable if it doesn't exist
  const user_timetable = JSON.parse(user.timetable) as Lesson[];
  if (
    user_timetable.length === 0 ||
    user_timetable[0].date !== new_timetable[0].date
  ) {
    log.debug(
      `${user.untis_username}: No up to date timetable exists, creating it ...`
    );

    db.query("UPDATE users SET timetable = $timetable WHERE id = $id").run({
      $timetable: JSON.stringify(new_timetable),
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

  const old_timetable = JSON.parse(
    user_quarry.timetable,
    (key: string, value: any) => {
      if (key === "date") {
        return new Date(value);
      }
      return value;
    }
  ) as Lesson[];
  db.query("UPDATE users SET timetable = $timetable WHERE id = $id").run({
    $timetable: JSON.stringify(new_timetable),
    $id: user.id,
  });

  const cancelled_lessons = filter_cancelled_lessons(
    new_timetable,
    old_timetable
  );

  return cancelled_lessons;
}
