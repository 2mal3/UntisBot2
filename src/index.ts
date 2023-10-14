log.info(`Starting v${process.env.npm_package_version} ...`);

import { Database } from "bun:sqlite";
import { CronJob } from "cron";
import {
  Client,
  REST,
  GatewayIntentBits,
  Partials,
  Routes,
  ChatInputCommandInteraction,
  ActivityType,
} from "discord.js";
import { log } from "logging";
import { Lesson, User } from "types";
import { user_login, get_cancelled_lessons } from "logic";

// Connect to the database
log.debug("Connecting to database ...");
let db: Database;
try {
  db = new Database("database/database.db");
} catch (error) {
  log.fatal(error);
  process.exit(1);
}
log.debug("Connected to database!");
process.on("exit", () => {
  db.close();
});

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

async function register_commands() {
  const commands = [
    {
      name: "ping",
      description: "Replies with Pong!",
    },
    {
      name: "login",
      description: "Login with your Untis credentials",
      options: [
        {
          name: "username",
          description: "Your Untis username",
          required: true,
          type: 3,
        },
        {
          name: "password",
          description: "Your Untis password",
          required: true,
          type: 3,
        },
        {
          name: "school_name",
          description: "Your school name",
          required: true,
          type: 3,
          min_length: 3,
        },
      ],
    },
  ];

  const rest = new REST({ version: "10" }).setToken(
    Bun.env.DISCORD_TOKEN ?? ""
  );

  try {
    log.debug("Started refreshing application (/) commands");

    await rest.put(
      Routes.applicationCommands(Bun.env.DISCORD_APPLICATION_ID ?? ""),
      { body: commands }
    );

    log.debug("Successfully reloaded application (/) commands.");
  } catch (error) {
    log.error(error);
  }
}

bot.on("ready", async () => {
  log.info("Bot connected!");

  await set_user_count_activity();
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName == "ping") {
    await interaction.reply({ content: "Pong!", ephemeral: false });
  } else if (interaction.commandName == "login") {
    await on_user_login(interaction);
  }
});

async function on_user_login(interaction: ChatInputCommandInteraction) {
  const username = interaction.options.getString("username") ?? "";
  const password = interaction.options.getString("password") ?? "";
  const school_name = interaction.options.getString("school_name") ?? "";

  log.info(`User "${username}" from "${school_name}" logging in ...`);

  await interaction.deferReply({ ephemeral: false });

  const result = await user_login(
    db,
    username,
    password,
    school_name,
    interaction.user.id
  );
  if (!result.success) {
    log.warn(`${username}: ${result.message}`);
    await interaction.editReply(result.message);
    return;
  }
  await interaction.editReply("Successfully logged in!");
  log.info(`${username}: Successfully logged in!`);

  await set_user_count_activity();
}

async function set_user_count_activity() {
  log.debug("Setting user count activity ...");

  const user_amount = db.query("SELECT * FROM users").all().length;
  bot.user?.setActivity(
    `${user_amount} timetables | v${process.env.npm_package_version}`,
    {
      type: ActivityType.Watching,
    }
  );

  log.debug("Set user count activity!");
}

async function main() {
  log.info("Checking timetables ...");

  const users = db.query("SELECT * FROM users").all() as User[];
  for (const user of users) {
    log.debug(`Checking timetable for "${user.untis_username}" ...`);
    const cancelled_lessons = await get_cancelled_lessons(db, user);
    await send_cancelled_lessons(cancelled_lessons, user.discord_user_id);
  }

  log.info("Checked all timetables!");

  await set_user_count_activity();
}

async function send_cancelled_lessons(
  cancelled_lessons: Lesson[],
  user_id: string
) {
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

    await bot.users.send(
      user_id,
      `The lesson **${lesson.name}** on **${lesson_date}** at **${lesson_time}** has been cancelled.`
    );
  }
}

db.exec("PRAGMA journal_mode = WAL;");
db.query(
  `CREATE TABLE IF NOT EXISTS "users" (
	"id"	TEXT NOT NULL UNIQUE,
	"untis_username"	TEXT NOT NULL,
	"untis_password"	TEXT NOT NULL,
	"untis_school_name"	TEXT NOT NULL,
	"untis_server"	TEXT NOT NULL,
	"timetable"	TEXT NOT NULL,
	"discord_user_id"	TEXT NOT NULL,
	PRIMARY KEY("id")
);`
).run();

await register_commands();
bot.login(process.env.DISCORD_TOKEN);

const job = new CronJob(
  "*/5 7 * * 1-5",
  () => {
    main();
  },
  null,
  true,
  Bun.env.TZ
);
