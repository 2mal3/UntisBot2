import { CronJob } from 'cron'
import { Client, GatewayIntentBits, Partials, TextChannel } from "discord.js";

const bot = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

function main() {
  console.log("hi");
}

// bot.login(process.env.DISCORD_TOKEN);
let job = new CronJob('* * * * *', main, null, true, process.env.TZ)
