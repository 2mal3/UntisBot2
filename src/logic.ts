import { Database } from "bun:sqlite";
import { log } from "logging";
import { Lesson, User } from "types";
import {
  get_school_from_name,
  get_cancelled_lessons,
  check_credentials,
} from "untis";
import { v4 as uuid4 } from "uuid";

export async function user_login(
  db: Database,
  user: User,
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
  if (!user.untis_qr_data) {
    try {
      const school = await get_school_from_name(user.untis_school_name);
      user.untis_school_name = school.school_name;
      user.untis_server = school.untis_server;
    } catch (error) {
      return {
        success: false,
        message: "No schools found for this school name",
      };
    }
  }

  // Check if the credentials are correct
  if (!(await check_credentials(user))) {
    return { success: false, message: "Bad credentials" };
  }

  // Add the user to the database
  db.query(
    "INSERT INTO users (id, untis_username, untis_password, untis_school_name, untis_server, untis_qr_data, discord_user_id) VALUES ($id, $untis_username, $untis_password, $untis_school_name, $untis_server, $untis_qr_data, $discord_user_id)",
  ).run({
    $id: uuid4(),
    $untis_username: user.untis_username,
    $untis_password: user.untis_password,
    $untis_school_name: user.untis_school_name,
    $untis_server: user.untis_server,
    $untis_qr_data: user.untis_qr_data,
    $discord_user_id: user.discord_user_id,
  });

  return { success: true, message: "" };
}

export async function get_new_cancelled_lessons(
  db: Database,
  user: User,
): Promise<Lesson[]> {
  // Get all canceled lessons this week
  const canceled_lessons = await get_cancelled_lessons(user);

  // Find all canceled lessons that are not currently saved
  const new_canceled_lessons = canceled_lessons.filter(
    (lesson) =>
      db
        .query(
          "SELECT * FROM cancelled_lessons WHERE name = $name AND date = $date AND user = $user",
        )
        .all({
          $name: lesson.name,
          $date: lesson.date,
          $user: user.id,
        }).length === 0,
  );

  // Save previously not saved lessons
  for (const lesson of new_canceled_lessons) {
    db.query(
      "INSERT INTO cancelled_lessons (name, date, user) VALUES ($name, $date, $user)",
    ).run({
      $name: lesson.name,
      $date: lesson.date,
      $user: user.id,
    });
  }

  return new_canceled_lessons;
}
