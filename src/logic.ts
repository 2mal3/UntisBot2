import { PrismaClient, User } from "@prisma/client";
import { chromium } from 'playwright';
import { WebAPITimetable, WebUntis } from "webuntis";
import { log } from "logging";
import { Lesson } from "lesson_type";

const prisma = new PrismaClient();

export async function user_login(
  username: string,
  password: string,
  school_name: string,
  discord_user_id: string
): Promise<{ success: boolean; message: any }> {
  if (
    (await prisma.user.count({ where: { untis_username: username } })) === 1
  ) {
    return { success: false, message: "Already logged in" };
  }

  const school = await get_school_from_name(school_name);
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

  await prisma.user.create({
    data: {
      untis_school_name: school.school_name,
      untis_username: username,
      untis_password: password,
      untis_server: school.untis_server,
      discord_user_id: discord_user_id,
    },
  });

  return { success: true, message: "" };
}

// Get the untis internal school name and the server url
// from the school search on the webuntis website
export async function get_school_from_name(
  name: string
): Promise<{ school_name: string; untis_server: string }> {
  log.debug(`Getting school from name: ${name} ...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://webuntis.com/");

  const search_input_selector = ".Select-placeholder";
  await page.waitForSelector(search_input_selector);
  await page.type(search_input_selector, name);

  const search_option_selector = ".search-option";
  await page.waitForSelector(search_option_selector);
  await page.click(search_option_selector);

  const untis_sever = page.url().split("/")[2];
  const school_name = page.url().split("/")[4].split("=")[1].replace("+", " ");

  await browser.close();

  log.debug(`Done! School name is ${school_name}`);
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

    await prisma.user.update({
      where: { id: user.id },
      data: { timetable: JSON.stringify(nice_timetable) },
    });
  }

  const user_quarry = await prisma.user.findUnique({ where: { id: user.id } });
  if (!user_quarry) {
    // FIXME: actually handle this error
    return [];
  }
  const old_timetable = JSON.parse(user_quarry.timetable);
  await prisma.user.update({
    where: { id: user.id },
    data: { timetable: JSON.stringify(nice_timetable) },
  });

  const cancelled_lessons = filter_cancelled_lessons(
    nice_timetable,
    old_timetable
  );

  return cancelled_lessons;
}
