import { WebAPITimetable, WebUntis } from "webuntis";
import { Client, GatewayIntentBits, Partials, TextChannel } from "discord.js";

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

interface Lesson {
  id: number;
  name: string;
  date: Date;
  cancelled: boolean;
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

async function get_timetable(): Promise<WebAPITimetable[]> {
  console.log(
    "Logging in with:",
    process.env.SCHOOL_NAME,
    process.env.UNTIS_USERNAME,
    process.env.UNTIS_PASSWORD,
    process.env.UNTIS_SERVER
  );
  const untis = new WebUntis(
    process.env.SCHOOL_NAME ?? "",
    process.env.UNTIS_USERNAME ?? "",
    process.env.UNTIS_PASSWORD ?? "",
    process.env.UNTIS_SERVER ?? ""
  );

  await untis.login();
  const timetable = await untis.getOwnTimetableForWeek(new Date());
  await untis.logout();

  return timetable;
}

function format_timetable(timetable: WebAPITimetable[]): Lesson[] {
  return timetable.map((lesson) => {
    const nice_lessons: Lesson = {
      id: lesson.id,
      name: lesson.subjects[0].element.longName ?? "missingno",
      date: create_date_from_untis_date(lesson.date, lesson.startTime),
      // Ignore this error, it's a bug in the typings
      cancelled: lesson.is.cancelled ?? false,
    };
    return nice_lessons;
  });
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

async function send_cancelled_lessons(cancelled_lessons: Lesson[]) {
  const channel = bot.channels.cache.get(process.env.CHANNEL_ID ?? "");

  // Loops through every lesson and sends a message to the channel
  for (const lesson of cancelled_lessons) {
    const lesson_date = new Date(lesson.date).toLocaleDateString("en-US", {
      weekday: "long",
    });
    const lesson_time = new Date(lesson.date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });

    await (channel as TextChannel)?.send(
      `The lesson **${lesson.name}** on **${lesson_date}** at **${lesson_time}** has been cancelled.`
    );
  }
}

bot.on("ready", async () => {
  console.log("Bot connected!");
  const channel = bot.channels.cache.get(process.env.CHANNEL_ID ?? "");
  await (channel as TextChannel)?.send("hi");

  const timetable = await get_timetable();
  const nice_timetable = format_timetable(timetable);

  const old_timetable = JSON.parse(await Bun.file("timetable.json").text());
  Bun.write("timetable.json", JSON.stringify(nice_timetable));

  const cancelled_lessons = filter_cancelled_lessons(
    nice_timetable,
    old_timetable
  );
  await send_cancelled_lessons(cancelled_lessons);

  process.exit(0);
});

bot.login(process.env.DISCORD_TOKEN);
