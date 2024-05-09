## Dota 2 Discord Bot (dotafy)
A discord bot that uses Steam Web API and OpenDota API to fetch Dota 2 game results, and performance.

> [src/main.js](https://github.com/yuan-miranda/dotafy/blob/main/src/main.js) source code of the bot.<br>
> [src/register_commands.js](https://github.com/yuan-miranda/dotafy/blob/main/src/register_commands.js) used to register the command.

## Slash Commands
Sends a help message on how to use the bot.
```
/help
```
List all the channels in this server.
```
/channels
```
Set the channel for logging messages. Must be on the channel you want to set. (admin only)
> all - Set the channel to logs all bot activity automatically i.e. auto standings, match results. **(Currently not working)**<br>
> match - Set the channel to log match results.<br>
> day - Set the channel to log daily performance standing.<br>
> week - Set the channel to log weekly performance standing.<br>
> month - Set the channel to log monthly performance standing.
```
/setchannel type <all | match | day | week | month>
```
Remove the channel for logging messages. Must be on the channel you want to remove. (admin only)
```
/unsetchannel
```
Register a user.
> id - Steam Id or Dota 2 Id.
```
/register add <id>
```
Remove the registered user.
> id - Steam Id or Dota 2 Id.
```
/register remove <id>
```
List registered users.
> without the parameter specified, defualt value is 'all'.<br>
> all - list all users.<br>
> public - list all the users that has public match history.<br>
> private - list all the users that has private match history.
```
/register list [<all | public | private>]
```
**(Currently not working)** I still have to think if this can be a command.
```
/all
```
Get the most recent match of the user.
> id - Steam Id or Dota 2 Id.
```
/match <id>
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
Convert the valid steam id to its dota 2 id. (seems accurate)
> id - Steam Id.
```
/dota2id <id>
```
Convert the dota 2 id to its steam id. (It only convert but doesnt verify it)
> id - Dota 2 Id.
```
/steamid <id>
```
Check if the steam id is valid.
> id - Steam Id.
```
/verifyid <id>
```

## Installation Setup (For those who wants to try the source code)
Download the following modules:
```
npm install dotenv canvas axios discord-bettermarkdown@latest discord.js -y
```

## Discord Bot Setup
- Go to https://discord.com/developers/applications and select or create a bot.
- Copy the Application ID.
![image](https://github.com/yuan-miranda/dissh/assets/142481797/dba230d1-a107-4ea1-9340-96404ce52b09)
- Go to `Bot` section and copy the bot's token (when its `Reset Token`, just do what it says).
![image](https://github.com/yuan-miranda/dissh/assets/142481797/5ac4ace5-e070-49ba-8b8b-adf79b2db77f)
- Enable the following Privileged Gateway Intents:
![image](https://github.com/yuan-miranda/dissh/assets/142481797/26160487-d1ff-403f-8e20-b9ce5e3e4160)
- And on the `OAuth2` section, go to `OAuth2 URL Generator`, and select 'bot > Administrator' and copy the generated url and enter it on your browser to invite your bot on the server.

## Getting Steam Web API Key
- Go to https://steamcommunity.com/dev and on this section on the image below, click the highlighted `by filling out this form` and log in on your Steam Account.
![image](https://github.com/yuan-miranda/dotafy/assets/142481797/7fe5de6e-a937-4fa0-8456-1c31ba6d2b10)
- And after logging in, you'll see this page, just enter anything you'd like for the name and hit register.
![image](https://github.com/yuan-miranda/dotafy/assets/142481797/5e626200-4639-4fed-9af2-f1a383e7de60)
- After that copy the API key.

## Code Setup
- After downloading the bot's source code, make a `.env` file inside the `src` folder.
- Inside the `.env` file, do the following, **this is an example value**, paste your api key, bot's token and id instead.
![image](https://github.com/yuan-miranda/dotafy/assets/142481797/b35bbc84-a1b0-4ad6-ac1e-afcd2468b006)


## Running the Bot
- Execute the following commands/files:
```
cd src
node register_commands.js main.js
```

## Your done!
DM me in discord for questions about the setups, ill gladly help.

https://discord.com/users/830369392453615636
