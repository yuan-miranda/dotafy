## Dota 2 Discord Bot (dotafy)
A discord bot that uses Steam Web API and OpenDota API to fetch Dota 2 game results, and performance.
> [src/main.js](https://github.com/yuan-miranda/dotafy/blob/main/src/main.js) source code of the bot.<br>
> [src/register_commands.js](https://github.com/yuan-miranda/dotafy/blob/main/src/register_commands.js) used to register the command.

## Slash Commands
Sends a help message on how to use the bot.
```
/help
```
List all the registered channels on this server.
```
/channels
```
Set the channel for logging messages.
> Must be on the channel you want to set. (admin only)
```
/setchannel type <match | day | week | month>
```
Remove the channel for logging messages.
> Must be on the channel you want to remove. (admin only)
```
/unsetchannel
```
Register a user.
```
/register add <id>
```
Remove the registered user.
```
/register remove <id>
```
List registered users.
> Leave the option blank and it will output all users.<br>
```
/register list [<all | public | private>]
```
Get the most recent match of the user.
```
/match <id>
```
Get the streaks of players.
> To enter the streak rank, user must be >= 3 of win/lose streak. Default value without the type will output both win and lose streak.<br>
```
/streaks type [<all | win | lose>]
```
Get the daily standings on the server.
```
/day
```
Get the weekly standings on the server.
```
/week
```
Get the monthly standings on the server.
```
/month
```
Get the yearly standings on the server.
```
/year
```
Convert a valid steam id to its dota 2 id.
```
/dota2id <id>
```
Convert the dota 2 id to its steam id.
> Only convert the dota 2 id to its steam id equivalent.
```
/steamid <id>
```
Check if the steam id is valid.
```
/verifyid <id>
```

## Installation Setup
**Note: You must have `Git`, `Node.js` and `npm` installed prior to this setup**.<br>
1. Clone the repository on your machine:
```
git clone https://github.com/yuan-miranda/dotafy.git
```
2. Download the following modules inside the `dissh` directory:
```
npm install dotenv canvas axios node-cron discord-bettermarkdown@latest discord.js -y
```
3. Setting up the discord bot:
  - Go to https://discord.com/developers/applications and select or create a bot.
  - Copy the Application ID. (discord bot id) ![image](https://github.com/yuan-miranda/dissh/assets/142481797/dba230d1-a107-4ea1-9340-96404ce52b09)
  - On the left side panel, go to `Bot` section and copy the bot's token. (when its 'Reset Token', just do what it says) ![image](https://github.com/yuan-miranda/dissh/assets/142481797/5ac4ace5-e070-49ba-8b8b-adf79b2db77f)
  - Scroll down and under the Privileged Gateway Intents, enable the following: ![image](https://github.com/yuan-miranda/dissh/assets/142481797/06396840-0b32-4056-a9aa-56cb44f4cc66)
  - And on the `OAuth2` section, go to `OAuth2 URL Generator`, and select `bot > Administrator` and copy the generated url and enter it on your browser to invite your bot on the server.
4. Getting the Steam Web API key.
  - Go to https://steamcommunity.com/dev and on this section similar to the image below, click the highlighted `by filling out this form` and log in with your Steam Account. ![image](https://github.com/yuan-miranda/dotafy/assets/142481797/7fe5de6e-a937-4fa0-8456-1c31ba6d2b10)
  - After logging in, you'll see this page, just enter anything you'd like for the name and hit register. ![image](https://github.com/yuan-miranda/dotafy/assets/142481797/5e626200-4639-4fed-9af2-f1a383e7de60)
  - Copy the API key that is shown after.
5. Create a `.env` file inside the `src` directory with the following values.
```
# .env contents
STEAM_API_KEY=YOUR_STEAM_WEB_API_KEY
TOKEN=YOUR_DISCORD_BOT_TOKEN
BOT_ID=YOUR_DISCORD_BOT_ID
```
6. To run the bot, execute the following commands inside the `src` directory.
```
node register_commands.js
node main.js
```

## Credits:
This project is mostly inspired by [Dota Sentry](https://dotasentry.net/) and [MangoByte](https://github.com/mdiller/MangoByte).
