# untisbot2

A Discord bot that uses your school's WebUntis API to automatically notify you of cancelled classes. The bot checks for cancelled classes every 5 minutes on weekdays from 7-8 am by default.

**The notifications come as a direct message. You may need to allow server members or new bots to send you DMs in Discord.**

## Commands

- `/login <username> <password> <school name>`: Log in to the system with normal username and password.
- `/qr-login <qr-code>`: Log in to the system with an Untis qr-code.
- `/ping`: Pong

## Environment Variables

- `DISCORD_TOKEN`: the auth token for the Discord bot that should send the notifications
- `DISCORD_APPLICATION_ID`: the application id of the Discord bot
- `TZ`: your time zone e.g. "America/New_York"

## Suggested Setup

- Create a Discord bot and get the necessary keys for the environment variables.
- Create your own Docker container based on the Docker image on [DockerHub](https://hub.docker.com/r/2mal3/untisbot2) and with the specified environment variables.
- Invite your bot to a Discord server or send it a DM to use the `/login` command.

## Main Libraries Used

- [discord.js](https://www.npmjs.com/package/discord.js): interaction with the Discord API
- [webuntis](https://www.npmjs.com/package/webuntis): interaction with the WebUntis API
