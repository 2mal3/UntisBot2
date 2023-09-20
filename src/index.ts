import { CronJob } from "cron";
import {
  Client,
  REST,
  GatewayIntentBits,
  Partials,
  TextChannel,
  Routes,
  ChatInputCommandInteraction
} from "discord.js";
import { log } from "logging";
import { register_user as user_login } from "logic"

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
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName == "ping") {
    await interaction.reply({ content: "Pong!", ephemeral: true });
  } else if (interaction.commandName == "login") {
    await on_user_login(interaction)
  }
});

async function on_user_login(interaction: ChatInputCommandInteraction) {
  const username = interaction.options.getString("username") ?? "";
  const password = interaction.options.getString("password") ?? "";
  const school_name = interaction.options.getString("school_name") ?? "";

  log.info(`User "${username}" from "${school_name}" logged in`)

  await interaction.deferReply({ ephemeral: true });

  const result = await user_login(username, password, school_name);
  if (!result.success) {
    log.error(result.message);
    await interaction.editReply(result.message);
    return;
  }
  await interaction.editReply("Successfully logged in!");
  log.info("Successfully logged in!");
}

function main() {
  log.info("Hi");
}

log.info("Starting ...");

await register_commands();
bot.login(process.env.DISCORD_TOKEN);

// const job = new CronJob("* * * * *", main, null, true, Bun.env.TZ);
