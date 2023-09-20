# untisbot2
[GitHub](https://github.com/2mal3/UntisBot2) • [DockerHub](https://hub.docker.com/r/2mal3/untisbot2)

A Discord bot that uses your school's WebUntis API to automatically notify you of cancelled classes.

## Environment Variables

- `SCHOOL_NAME`: the internal WebUntis name of your school
- `UNTIS_USERNAME`: your Untis account username
- `UNTIS_PASSWORD`: your Untis account password
- `UNTIS_SERVER` : the internet address of the WebUntis server (e. g. cissa.webuntis.com)
- `DISCORD_TOKEN`: the auth token for the discord bot that should send the notifications
- `CHANNEL_ID`: the id of the Discord channel to which the notifications should be sent
- `TZ`: your time zone e.g. "America/New_York"

## Libraries Used

- [discord.js](https://www.npmjs.com/package/discord.js): interaction with the Discord API
- [webuntis](https://www.npmjs.com/package/webuntis): interaction with the WebUntis API
