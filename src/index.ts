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
import { fetchAndDecodeQR } from "utils";
import { user_login, get_new_cancelled_lessons } from "logic";

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
process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
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
      description: "Login with your Untis password and username",
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
          name: "school-name",
          description: "Your school name",
          required: true,
          type: 3,
          min_length: 3,
        },
      ],
    },
    {
      name: "qr-login",
      description: "Login with your Untis QR code",
      options: [
        {
          name: "qr-code",
          description: "A picture of your Untis QR code",
          required: true,
          type: 11,
        },
      ],
    },
  ];

  const rest = new REST({ version: "10" }).setToken(
    Bun.env.DISCORD_TOKEN ?? "",
  );

  try {
    log.debug("Started refreshing application (/) commands");

    await rest.put(
      Routes.applicationCommands(Bun.env.DISCORD_APPLICATION_ID ?? ""),
      { body: commands },
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
    await on_user_login(interaction, normal_user_login_provider);
  } else if (interaction.commandName == "qr-login") {
    await on_user_login(interaction, qr_user_login_provider);
  }
});

async function on_user_login(
  interaction: ChatInputCommandInteraction,
  provider: (interaction: ChatInputCommandInteraction) => Promise<{
    user: User | null;
    error: string | null;
  }>,
) {
  await interaction.deferReply({ ephemeral: true });

  // Get the user type and return with error if the user is not valid
  const user_error = await provider(interaction);
  if (user_error.error) {
    log.warn(`${interaction.user.id}: ${user_error.error}`);
    await interaction.editReply(user_error.error);
    return;
  }
  const user: User = user_error.user!;

  log.info(
    `User "${user.untis_username}" from "${user.untis_school_name}" logging in ...`,
  );

  // Test the provided credentials
  const result = await user_login(db, user);
  if (!result.success) {
    log.warn(`${user.untis_username}: ${result.message}`);
    await interaction.editReply(result.message);
    return;
  }

  // When the user is successfully logged in
  await interaction.editReply("Successfully logged in!");
  log.info(`${user.untis_username}: Successfully logged in!`);

  await set_user_count_activity();
}

async function qr_user_login_provider(
  interaction: ChatInputCommandInteraction,
): Promise<{
  user: User | null;
  error: string | null;
}> {
  const discord_qr_data = interaction.options.getAttachment("qr-code");

  if (!discord_qr_data) {
    return {
      user: null,
      error: "Please provide a QR code!",
    };
  }

  // Return error when the attachment is not an image
  if (
    !discord_qr_data.contentType ||
    !discord_qr_data.contentType.startsWith("image")
  ) {
    return {
      user: null,
      error: "Not an Image!",
    };
  }

  // Get the attachment image from the provided URL
  const untis_qr_data = await fetchAndDecodeQR(discord_qr_data.url);
  if (!untis_qr_data) {
    return {
      user: null,
      error: "Could not decode the QR code!",
    };
  }

  // TODO: regex check for the qr code text to prevent wrong qr codes
  const regex = /user=([^&]+)/;
  const username = regex.exec(untis_qr_data);
  if (!username || !username[1]) {
    return {
      user: null,
      error: "Wrong QR code!",
    };
  }

  const user: User = {
    id: "",
    untis_username: username[1],
    untis_password: "",
    untis_school_name: "",
    untis_server: "",
    untis_qr_data: untis_qr_data,
    discord_user_id: interaction.user.id,
  };

  return { user: user, error: null };
}

function normal_user_login_provider(
  interaction: ChatInputCommandInteraction,
): Promise<{
  user: User | null;
  error: string | null;
}> {
  const username = interaction.options.getString("username") ?? "";
  const password = interaction.options.getString("password") ?? "";
  const school_name = interaction.options.getString("school-name") ?? "";

  const user: User = {
    id: "",
    untis_username: username,
    untis_password: password,
    untis_school_name: school_name,
    untis_server: "",
    untis_qr_data: "",
    discord_user_id: interaction.user.id,
  };

  return Promise.resolve({ user: user, error: null });
}

async function set_user_count_activity() {
  log.debug("Setting user count activity ...");

  const user_amount = db.query("SELECT * FROM users").all().length;
  bot.user?.setActivity(
    `${user_amount} timetables | v${process.env.npm_package_version}`,
    {
      type: ActivityType.Watching,
    },
  );

  log.debug("Set user count activity!");
}

async function main() {
  log.info("Checking timetables ...");

  const users = db.query("SELECT * FROM users").all() as User[];
  for (const user of users) {
    log.debug(`Checking timetable for "${user.untis_username}" ...`);
    const cancelled_lessons = await get_new_cancelled_lessons(db, user);
    await send_cancelled_lessons(cancelled_lessons, user.discord_user_id);
  }

  log.info("Checked all timetables!");

  await set_user_count_activity();
}

async function send_cancelled_lessons(
  cancelled_lessons: Lesson[],
  user_id: string,
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
      `The lesson **${lesson.name}** on **${lesson_date}** at **${lesson_time}** has been cancelled.`,
    );
  }
}

db.exec("PRAGMA journal_mode = WAL;");
db.query(
  `CREATE TABLE IF NOT EXISTS "users" (
    "id"	              TEXT NOT NULL UNIQUE,
    "untis_username"	  TEXT NOT NULL,
    "untis_password"	  TEXT NOT NULL,
    "untis_school_name"	TEXT NOT NULL,
    "untis_server"	    TEXT NOT NULL,
    "untis_qr_data"     TEXT,
    "discord_user_id"	  TEXT NOT NULL,
    PRIMARY KEY("id")
  );`,
).run();
db.query(
  `CREATE TABLE IF NOT EXISTS "cancelled_lessons" (
    "name"  TEXT NOT NULL,
    "date"  NUMBER NOT NULL,
    "user"  TEXT NOT NULL,
    PRIMARY KEY("name", "date", "user")
  );`,
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
  Bun.env.TZ,
);
