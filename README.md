# untisbot2

[GitHub](https://github.com/2mal3/UntisBot2) • [DockerHub](https://hub.docker.com/r/2mal3/untisbot2)

A Discord bot that uses your school's WebUntis API to automatically notify you of cancelled classes.

## Environment Variables

- `DISCORD_TOKEN`: the auth token for the Discord bot that should send the notifications
- `DISCORD_APPLICATION_ID`: the application id of the Discord bot
- `TZ`: your time zone e.g. "America/New_York"

## Main Libraries Used

- [discord.js](https://www.npmjs.com/package/discord.js): interaction with the Discord API
- [webuntis](https://www.npmjs.com/package/webuntis): interaction with the WebUntis API
