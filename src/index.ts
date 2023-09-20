import { CronJob } from "cron";
import {
  Client,
  REST,
  GatewayIntentBits,
  Partials,
  TextChannel,
  Routes,
} from "discord.js";
import { log } from "logging";

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
    await interaction.reply("Pong!");
  }
});

function main() {
  log.info("Hi");
}

await register_commands();
bot.login(process.env.DISCORD_TOKEN);
const job = new CronJob("* * * * *", main, null, true, Bun.env.TZ);
