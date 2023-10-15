import { Lesson, User } from "types";
import { WebAPITimetable, WebUntis } from "webuntis";

export async function get_timetable(user: User): Promise<Lesson[]> {
  const untis = new WebUntis(
    user.untis_school_name,
    user.untis_username,
    user.untis_password,
    user.untis_server
  );

  await untis.login();
  const timetable = await untis.getOwnTimetableForWeek(new Date());
  await untis.logout();

  return format_timetable(timetable);
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

  if (data.result.schools.length === 0) {
    throw new Error("No schools found");
  }

  const school_name = data.result.schools[0].loginName;
  const untis_sever = data.result.schools[0].server;

  return { school_name: school_name, untis_server: untis_sever };
}

export async function check_credentials(
  school_name: string,
  username: string,
  password: string,
  server: string
): Promise<boolean> {
  const untis = new WebUntis(school_name, username, password, server);

  try {
    await untis.login();
    await untis.logout();
  } catch (error) {
    return false;
  }

  return true;
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

  const date_string = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
  const date = new Date(date_string);

  return date;
}
