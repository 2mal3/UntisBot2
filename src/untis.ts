import { WebAPITimetable, WebUntis, WebUntisQR } from "webuntis";
import { URL } from "url"
import { authenticator as Authenticator } from "otplib"
import { log } from "logging";
import { Lesson, User } from "types";


function getUntisObject(user: User): WebUntis {
  if (user.untis_qr_data) {
    log.debug("Using QR code login")

    // FIXME: problem with bun
    return new WebUntisQR(
      user.untis_qr_data,
      "UntisBot",
      Authenticator,
      URL
    )
  }

  log.debug("Using normal login")
  return new WebUntis(
    user.untis_school_name,
    user.untis_username,
    user.untis_password,
    user.untis_server
  )
}

export async function get_cancelled_lessons(user: User): Promise<Lesson[]> {
  const untis = getUntisObject(user);

  await untis.login();
  const timetable = await untis.getOwnTimetableForWeek(new Date());
  await untis.logout();

  return filter_cancelled_lessons(timetable);
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

export async function check_credentials(user: User): Promise<boolean> {
  const untis = getUntisObject(user);

  try {
    await untis.login();
    await untis.logout();
  } catch (error) {
    log.error(error)
    return false;
  }

  return true;
}

function filter_cancelled_lessons(timetable: WebAPITimetable[]): Lesson[] {
  let cancelled_lessons: Lesson[] = [];

  for (const lesson of timetable) {
    // Ignore this error, it's a bug in the typings
    if (
      (lesson.is.cancelled ?? false) ||
      lesson.teachers[0].element.name === "---"
    ) {
      let cancelled_lesson: Lesson = {
        name: lesson.subjects[0].element.longName ?? "missingno",
        date: date_from_untis_date(lesson.date, lesson.startTime).getTime(),
      };

      cancelled_lessons.push(cancelled_lesson);
    }
  }

  return cancelled_lessons;
}

function date_from_untis_date(
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
