const fs = require("fs");
const axios = require("axios");
const bmd = require("discord-bettermarkdown");
const cron = require("node-cron");
const { createCanvas, loadImage } = require("canvas");
require("dotenv").config({ path: `${__dirname}/.env` });

// stores the last match id that was sent to the channel.
// key: matchId, value: [channelId]
let lastMatchIds = {};

// keeps track of the current index of the match id that was interacted with the next/previous button.
// key: messageId, value: index
let lastMatchIndex = {};

// list of dota 2 heroes (updated every 24 hours)
// key: heroId, value: [hero_name, Hero Name]
let dota2Heroes = {};

// list of dota 2 hero icon urls (updated every 24 hours)
// key: heroName, value: hero_icon_url
let dota2HeroIconsUrl = {};

// list of dota 2 game modes (updated every 24 hours)
// key: gameModeId, value: game mode name
let gameModes = {};

// list of dota 2 ids that are in the message.
// key: messageId, value: steamId
let messagePlayerIds = {};

// list of player win and lose streaks.
// playerStreaks = {
//     serverId: {
//         steamId: {
//             win: 0,
//             lose: 0
//         }, ...
//     }, ...
// };
let playerStreaks = {};

// similar to dailyStandings, but this is used to get the KDA of the players.
// dailyStats = {
//     serverId: {
//         steamId: {
//             kills: 0,
//             deaths: 0,
//             assists: 0
//         }, ...
//     }, ...
// }
let dailyStats = {};

// list of daily, weekly, monthly, and yearly standings.
// dailyStanding = {
//     standing: {
//         serverId: {
//             steamId: {win: 0, lose: 0}, ...
//         }, ...
//     }
// };
let dailyStandings = {};
let weeklyStandings = {};
let monthlyStandings = {};
let yearlyStandings = {};

function sortUsers(standing) {
    let users = Object.keys(standing);
    
    // prioritize win count first then win - lose difference if they both have the same win count.
    users.sort((a, b) => {
        let diff = standing[b].win - standing[a].win;
        if (diff !== 0) return diff;
        return (standing[b].win - standing[b].lose) - (standing[a].win - standing[a].lose);
    });
    return users;
}

// retun the daily standing of the server specified.
async function day(serverId) {
    if (!dailyStandings[serverId]) dailyStandings[serverId] = {};
    const sortedUsers = sortUsers(dailyStandings[serverId]);
    let topPlayers = "";
    let unchangedPlayers = "";
    let bottomPlayers = "";

    for (let steamId of sortedUsers) {
        if (!dailyStandings[serverId][steamId]) dailyStandings[serverId][steamId] = {win: 0, lose: 0};

        let player = dailyStandings[serverId][steamId];
        let playerName = (await getPlayerName(steamId)).substring(0, 32);
        let playerWin = player.win;
        let playerLose = player.lose;

        if (playerWin > playerLose) topPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}+${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.green;
        else if (playerWin < playerLose) bottomPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}${(playerWin - playerLose).toString().padEnd(6)}${playerName}\n`.red;
        else unchangedPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(6)}${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.white;
    }
    if (topPlayers === "" && unchangedPlayers === "" && bottomPlayers === "") return "No data found.";
    return `\`\`\`ansi\n${"W".padEnd(5)}${"L".padEnd(5)}${"GAP".padEnd(6)}Player name\n${topPlayers}${unchangedPlayers}${bottomPlayers}\n\`\`\``;
}

// return the weekly standing of the server specified.
async function week(serverId) {
    if (!weeklyStandings[serverId]) weeklyStandings[serverId] = {};
    let sortedUsers = sortUsers(weeklyStandings[serverId]);
    let topPlayers = "";
    let unchangedPlayers = "";
    let bottomPlayers = "";

    for (let steamId of sortedUsers) {
        if (!weeklyStandings[serverId][steamId]) weeklyStandings[serverId][steamId] = {win: 0, lose: 0};

        let player = weeklyStandings[serverId][steamId];
        let playerName = (await getPlayerName(steamId)).substring(0, 32);
        let playerWin = player.win;
        let playerLose = player.lose;

        if (playerWin > playerLose) topPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}+${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.green;
        else if (playerWin < playerLose) bottomPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}${(playerWin - playerLose).toString().padEnd(6)}${playerName}\n`.red;
        else unchangedPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(6)}${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.white;
    }
    if (topPlayers === "" && unchangedPlayers === "" && bottomPlayers === "") return "No data found.";
    return `\`\`\`ansi\n${"W".padEnd(5)}${"L".padEnd(5)}${"GAP".padEnd(6)}Player name\n${topPlayers}${unchangedPlayers}${bottomPlayers}\n\`\`\``;
}

// return the monthly standing of the server specified.
async function month(serverId) {
    if (!monthlyStandings[serverId]) monthlyStandings[serverId] = {};
    let sortedUsers = sortUsers(monthlyStandings[serverId]);
    let topPlayers = "";
    let unchangedPlayers = "";
    let bottomPlayers = "";

    for (let steamId of sortedUsers) {
        if (!monthlyStandings[serverId][steamId]) monthlyStandings[serverId][steamId] = {win: 0, lose: 0};
    
        let player = monthlyStandings[serverId][steamId];
        let playerName = (await getPlayerName(steamId)).substring(0, 32);
        let playerWin = player.win;
        let playerLose = player.lose;

        if (playerWin > playerLose) topPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}+${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.green;
        else if (playerWin < playerLose) bottomPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}${(playerWin - playerLose).toString().padEnd(6)}${playerName}\n`.red;
        else unchangedPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(6)}${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.white;
    }
    if (topPlayers === "" && unchangedPlayers === "" && bottomPlayers === "") return "No data found.";
    return `\`\`\`ansi\n${"W".padEnd(5)}${"L".padEnd(5)}${"GAP".padEnd(6)}Player name\n${topPlayers}${unchangedPlayers}${bottomPlayers}\n\`\`\``;
}

// return the yearly standing of the server specified.
async function year(serverId) {
    if (!yearlyStandings[serverId]) yearlyStandings[serverId] = {};
    let sortedUsers = sortUsers(yearlyStandings[serverId]);
    let topPlayers = "";
    let unchangedPlayers = "";
    let bottomPlayers = "";

    for (let steamId of sortedUsers) {
        if (!yearlyStandings[serverId][steamId]) yearlyStandings[serverId][steamId] = {win: 0, lose: 0};

        let player = yearlyStandings[serverId][steamId];
        let playerName = (await getPlayerName(steamId)).substring(0, 32);
        let playerWin = player.win;
        let playerLose = player.lose;

        if (playerWin > playerLose) topPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}+${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.green;
        else if (playerWin < playerLose) bottomPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(5)}${(playerWin - playerLose).toString().padEnd(6)}${playerName}\n`.red;
        else unchangedPlayers += `${playerWin.toString().padEnd(5)}${playerLose.toString().padEnd(6)}${(playerWin - playerLose).toString().padEnd(5)}${playerName}\n`.white;
    }
    if (topPlayers === "" && unchangedPlayers === "" && bottomPlayers === "") return "No data found.";
    return `\`\`\`ansi\n${"W".padEnd(5)}${"L".padEnd(5)}${"GAP".padEnd(6)}Player name\n${topPlayers}${unchangedPlayers}${bottomPlayers}\n\`\`\``;
}

function getDate() {
    let date = new Date();
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTime() {
    let date = new Date();
    let hour = date.getHours().toString().padStart(2, '0');
    let minute = date.getMinutes().toString().padStart(2, '0');
    let second = date.getSeconds().toString().padStart(2, '0');
    return `${hour}:${minute}:${second}`;
}

async function getStreaksOf(serverId, streakType) {
    if (!playerStreaks[serverId]) playerStreaks[serverId] = {};
    const sortedUsers = sortUsers(playerStreaks[serverId]);
    let winStreakPlayers = "";
    let loseStreakPlayers = "";

    for (let steamId of sortedUsers){
        if (!playerStreaks[serverId][steamId]) playerStreaks[serverId][steamId] = {win: 0, lose: 0};

        let playerName = await getPlayerName(steamId);
        let player = playerStreaks[serverId][steamId];
        let playerWin = player.win;
        let playerLose = player.lose;

        if (playerWin >= 3) winStreakPlayers += `+${playerWin.toString().padEnd(8)}${playerName}\n`.green;
        else if (playerLose >= 3) loseStreakPlayers += `-${playerLose.toString().padEnd(8)}${playerName}\n`.red;
    }
    if (streakType === "win" && winStreakPlayers !== "") return `**Win streaks**\`\`\`ansi\n${winStreakPlayers}\n\`\`\``;
    else if (streakType === "lose" && loseStreakPlayers !== "") return `**Lose streaks**\`\`\`ansi\n\n${loseStreakPlayers}\n\`\`\``;
    else if (streakType === "all" && (winStreakPlayers !== "" || loseStreakPlayers !== "")) return `**Win streaks**\`\`\`ansi\n${winStreakPlayers === "" ? "No data found." : winStreakPlayers}\`\`\`\n**Lose streaks**\`\`\`ansi\n${loseStreakPlayers === "" ? "No data found." : loseStreakPlayers}\n\`\`\``;
    else return "No data found.";
}

async function getLeaderboardsOf(serverId) {
    const steamIds = loadRegisteredSteamIdsOf(serverId);
    const server = client.guilds.cache.get(serverId);
    let users = {};
    let leaderboard = "";

    for (let steamId of steamIds) users[steamId] = (await axios.get(`https://api.opendota.com/api/players/${getDota2IdBySteamId(steamId)}`)).data.rank_tier;
    
    let sortedUserTiers = Object.keys(users);
    sortedUserTiers.sort((a, b) => users[b] - users[a]);

    for (let steamId of sortedUserTiers) {
        const rank_emoji = users[steamId] === null ? server.emojis.cache.find(emoji => emoji.name === "seasonalrank00") : server.emojis.cache.find(emoji => emoji.name === `seasonalrank${users[steamId]}`);
        leaderboard += `${rank_emoji} ${await getPlayerName(steamId)}\n`;
    }
    return leaderboard;
}

async function getDailyStatsOf(serverId) {
    if (!dailyStats[serverId]) dailyStats[serverId] = {};
    let users = Object.keys(dailyStats[serverId]);
    const topKills = users.sort((a, b) => dailyStats[serverId][b].kills - dailyStats[serverId][a].kills).slice(0, 3);
    const topDeaths = users.sort((a, b) => dailyStats[serverId][b].deaths - dailyStats[serverId][a].deaths).slice(0, 3);
    const topAssists = users.sort((a, b) => dailyStats[serverId][b].assists - dailyStats[serverId][a].assists).slice(0, 3);

    let topKillsString = "";
    for (let steamId of topKills) {
        const playerName = await getPlayerName(steamId);
        const playerKills = dailyStats[serverId][steamId].kills;
        topKillsString += `${playerKills.toString().padEnd(5)}${playerName}\n`;
    }

    let topDeathsString = "";
    for (let steamId of topDeaths) {
        const playerName = await getPlayerName(steamId);
        const playerDeaths = dailyStats[serverId][steamId].deaths;
        topDeathsString += `${playerDeaths.toString().padEnd(5)}${playerName}\n`;
    }

    let topAssistsString = "";
    for (let steamId of topAssists) {
        const playerName = await getPlayerName(steamId);
        const playerAssists = dailyStats[serverId][steamId].assists;
        topAssistsString += `${playerAssists.toString().padEnd(5)}${playerName}\n`;
    }
    return `\`\`\`ansi\nCombat Kings ⚔️\n${topKillsString === "" ? "No data found." : topKillsString}\nAssist Generals 🤝\n${topAssistsString === "" ? "No data found." : topAssistsString}\nSuicide Squads ☠️\n${topDeathsString === "" ? "No data found." : topDeathsString}\`\`\``;
}

// return the most recent match played.
async function getLastMatch(steamId) {
    return JSON.parse(fs.readFileSync(`${__dirname}/data/api_fetched/GMH${steamId}.json`)).result.matches[0];
}

// return the match data of the index specified from getLast100Match().
async function getMatchIndex(index, steamId) {
    return JSON.parse(fs.readFileSync(`${__dirname}/data/api_fetched/GMH${steamId}.json`)).result.matches[index];
}

// return a formatted string of the kda of the team.
function getTeamKDA(team) {
    let kills = 0;
    let deaths = 0;
    let assists = 0;
    for (let player of team) {
        kills += player.kills;
        deaths += player.deaths;
        assists += player.assists;
    }
    return `${kills}/${deaths}/${assists}`;
}

// return the total net worth of the team.
function getTeamNet(team) {
    let net = 0;
    for (let player of team) net += player.net_worth;
    return net;
}

// return the total damage of the team.
function getTeamDamage(team) {
    let damage = 0;
    for (let player of team) damage += player.hero_damage;
    return damage;
}

// return the list of players of the team.
function getTeamOf(team, matchDetails) {
    if (team === "radiant") return matchDetails.result.players.filter(player => player.team_number === 0);
    else if (team === "dire") return matchDetails.result.players.filter(player => player.team_number === 1);
}

// return the list of dota 2 hero icons.
async function getHeroIcons() {
    let heroIconsObject = {};
    for (let hero in dota2Heroes) heroIconsObject[dota2Heroes[hero][0]] = `http://cdn.dota2.com/apps/dota2/images/heroes/${dota2Heroes[hero][1]}_full.png`
    return heroIconsObject;
}

// return the list of player details of the team.
async function getTeamPlayerDetailsOf(team, matchDetails) { // current issue, some of the ids are not the same with opendota/heroes indexing.
    const playerDetails = getTeamOf(team, matchDetails).map(async player => {
        const heroName = dota2Heroes[player.hero_id] ? dota2Heroes[player.hero_id][0] : "UNKNOWN HERO";
        const heroIconUrl = dota2HeroIconsUrl[heroName] || "https://github.com/yuan-miranda/UNKNOWN_HERO.png/raw/main/UNKNOWN_HERO.png";
        return {
            playerName: player.account_id !== 4294967295 ? await getPlayerName(getSteamIdByDota2Id(player.account_id)) : "Anonymous",
            playerHeroLevel: player.level.toString(),
            playerHeroName: heroName,
            playerKills: player.kills,
            playerDeaths: player.deaths,
            playerAssists: player.assists,
            playerNet: player.net_worth,
            playerLH: player.last_hits,
            playerDN: player.denies,
            playerGPM: player.gold_per_min.toString(),
            playerXPM: player.xp_per_min.toString(),

            playerKills: player.kills,
            playerDeaths: player.deaths,
            playerAssists: player.assists,
            playerHeroIconUrl: heroIconUrl,
            playerHeroDamage: player.hero_damage,
            playerTeam: team === "radiant" ? "Radiant" : "Dire"
        };
    });
    return await Promise.all(playerDetails);
}

// return the steam avatar of the steam user.
function getSteamUserAvatar(steamId) {
    return JSON.parse(fs.readFileSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`)).response.players[0].avatar;
}

// return the list of dota 2 heroes.
async function getDota2Heroes() {
    const response = await axios.get('https://api.opendota.com/api/heroes');
    let heroObjects = {};
    for (let hero of response.data) {
        heroObjects[hero.id] = [
            hero.localized_name,
            hero.name.replace("npc_dota_hero_", "")
        ]
    }
    return heroObjects;
}

// return the list of dota 2 game modes.
async function getDota2GameModes() {
    const response = await axios.get('https://api.opendota.com/api/constants/game_mode');
    let gameModeObjects = {};
    for (let gameMode of Object.values(response.data)) gameModeObjects[gameMode.id] = gameMode.name.split("_").splice(2).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    return gameModeObjects;
}

// this is essentially getting the steamId3 from the steamId - the steam64Base constant, I think dota 2 id uses steamId3. This needs a string argument.
function getDota2IdBySteamId(steamId) {
    const steam64Base = BigInt("76561197960265728");
    return (BigInt(steamId) - steam64Base).toString();
}

// convert the dota 2 id to steam id. (steamId3 to steamId)
function getSteamIdByDota2Id(dota2Id) {
    const steam64Base = BigInt("76561197960265728");
    return (BigInt(dota2Id) + steam64Base).toString();
}

// get player name from (Steam username).
async function getPlayerName(steamId) {
    if (!fs.existsSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`)) await isSteamIdValid(steamId); // write the GetPlayerSummaries data to the file.
    const playerData = JSON.parse(fs.readFileSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`));
    return playerData.response.players[0].personaname;
}

async function getServerName(serverId) {
    const server = client.guilds.cache.get(serverId);
    return server ? server.name : "";
}

// return the last 100 matches played by the user.
async function isMatchHistoryPublic(steamId) {
    const matchHistory = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key=${process.env.STEAM_API_KEY}&account_id=${steamId}&matches_requested=100`);
    fs.writeFileSync(`${__dirname}/data/api_fetched/GMH${steamId}.json`, JSON.stringify(matchHistory.data, null, 4));
    return matchHistory.data.result.status !== 15; // match history is private.
}

// check if the steam id is valid.
async function isSteamIdValid(steamId){
    if (steamId.length !== 17) return false;
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`);
    if (response.data.response.players.length === 0) return false;
    fs.writeFileSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`, JSON.stringify(response.data, null, 4));
    return true;
}

// check if the steam id is stored at the specified server.
function isSteamIdRegisteredAt(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds.includes(steamId) : false;
}

// check if the steam id is stored in any server.
function isSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    return servers.some(obj => obj.registeredSteamIds.includes(steamId));
}

// check if the channel is registered at the server specified.
function isChannelRegisteredAt(serverId, channelId, channelType) {
    if (channelType === "") return false;
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds[channelType].includes(channelId) : false;
}

// load the server ids where the steam id is registered.
function loadWhereSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const filteredServers = servers.filter(obj => obj.registeredSteamIds.includes(steamId));
    return filteredServers.map(obj => obj.serverName);
}

// laod all the registered channels of the server specified.
function loadRegisteredChannelTypesOf(serverId, channelType) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds[channelType] : [];
}
// return all the registered channels of the server specified in object form.
function loadAllRegisteredChannelsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    let allChannels = {};
    if (!server) return {};
    for (let key in server.registeredChannelIds) {
        if (!allChannels[key]) allChannels[key] = [];
        allChannels[key] = [...allChannels[key], ...server.registeredChannelIds[key]];
    }
    return allChannels;
}

// load all the registered steam ids of the server specified.
function loadRegisteredSteamIdsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds : [];
}

// load the channel type of the channel id specified.
function loadChannelTypeOf(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? Object.keys(server.registeredChannelIds).find(key => server.registeredChannelIds[key].includes(channelId)) || "" : "";
}

// initialize the servers.json file and the initial folder structure.
function initializeFolders() {
    fs.mkdirSync(`${__dirname}/data/server`, { recursive: true }, () => {});
    fs.mkdirSync(`${__dirname}/data/api_fetched`, { recursive: true }, () => {});
    fs.mkdirSync(`${__dirname}/data/banner`, { recursive: true }, () => {});
    fs.mkdirSync(`${__dirname}/data/variables`, { recursive: true }, () => {});
}
function initializeFiles() {
    if (!fs.existsSync(`${__dirname}/data/server/servers.json`)) fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: []}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/lastMatchIds.json`)) fs.writeFileSync(`${__dirname}/data/variables/lastMatchIds.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/lastMatchIndex.json`)) fs.writeFileSync(`${__dirname}/data/variables/lastMatchIndex.json`, JSON.stringify({}, null, 4));
    // if (!fs.existsSync(`${__dirname}/data/variables/dota2Heroes.json`)) fs.writeFileSync(`${__dirname}/data/variables/dota2Heroes.json`, JSON.stringify({}, null, 4));
    // if (!fs.existsSync(`${__dirname}/data/variables/dota2HeroIconsUrl.json`)) fs.writeFileSync(`${__dirname}/data/variables/dota2HeroIconsUrl.json`, JSON.stringify({}, null, 4));
    // if (!fs.existsSync(`${__dirname}/data/variables/gameModes.json`)) fs.writeFileSync(`${__dirname}/data/variables/gameModes.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/messagePlayerIds.json`)) fs.writeFileSync(`${__dirname}/data/variables/messagePlayerIds.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/playerStreaks.json`)) fs.writeFileSync(`${__dirname}/data/variables/playerStreaks.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/dailyStandings.json`)) fs.writeFileSync(`${__dirname}/data/variables/dailyStandings.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/weeklyStandings.json`)) fs.writeFileSync(`${__dirname}/data/variables/weeklyStandings.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/monthlyStandings.json`)) fs.writeFileSync(`${__dirname}/data/variables/monthlyStandings.json`, JSON.stringify({}, null, 4));
    if (!fs.existsSync(`${__dirname}/data/variables/yearlyStandings.json`)) fs.writeFileSync(`${__dirname}/data/variables/yearlyStandings.json`, JSON.stringify({}, null, 4));
}

function saveData() {
    fs.writeFileSync(`${__dirname}/data/variables/lastMatchIds.json`, JSON.stringify(lastMatchIds, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/lastMatchIndex.json`, JSON.stringify(lastMatchIndex, null, 4));
    // fs.writeFileSync(`${__dirname}/data/variables/dota2Heroes.json`, JSON.stringify(dota2Heroes, null, 4));
    // fs.writeFileSync(`${__dirname}/data/variables/dota2HeroIconsUrl.json`, JSON.stringify(dota2HeroIconsUrl, null, 4));
    // fs.writeFileSync(`${__dirname}/data/variables/gameModes.json`, JSON.stringify(gameModes, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/messagePlayerIds.json`, JSON.stringify(messagePlayerIds, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/playerStreaks.json`, JSON.stringify(playerStreaks, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/dailyStandings.json`, JSON.stringify(dailyStandings, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/weeklyStandings.json`, JSON.stringify(weeklyStandings, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/monthlyStandings.json`, JSON.stringify(monthlyStandings, null, 4));
    fs.writeFileSync(`${__dirname}/data/variables/yearlyStandings.json`, JSON.stringify(yearlyStandings, null, 4));
}

async function loadData() {
    gameModes = await getDota2GameModes();
    dota2Heroes = await getDota2Heroes();
    dota2HeroIconsUrl = await getHeroIcons();
    lastMatchIds = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/lastMatchIds.json`));
    lastMatchIndex = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/lastMatchIndex.json`));
    // dota2Heroes = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/dota2Heroes.json`));
    // dota2HeroIconsUrl = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/dota2HeroIconsUrl.json`));
    // gameModes = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/gameModes.json`));
    messagePlayerIds = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/messagePlayerIds.json`));
    playerStreaks = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/playerStreaks.json`));
    dailyStandings = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/dailyStandings.json`));
    weeklyStandings = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/weeklyStandings.json`));
    monthlyStandings = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/monthlyStandings.json`));
    yearlyStandings = JSON.parse(fs.readFileSync(`${__dirname}/data/variables/yearlyStandings.json`));
}

// register the steam id and also channels that are registered in the server specified. (if there are any)
async function registerSteamId(steamId, serverId) {
    let servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    // if the server object doesnt exist, initialize a new one.
    if (!server) {
        server = {
            serverId: serverId,
            serverName: await getServerName(serverId),
            registeredSteamIds: [],
            registeredChannelIds: {
                match: [],
                streaks: [],
                stats: [],
                day: [],
                week: [],
                month: [],
                year: []
            }
        }
        servers.push(server);
    }
    server.registeredSteamIds.push(steamId);
    fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the registerd steam id of the server specified.
function removeRegisteredSteamIdOf(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredSteamIds = server.registeredSteamIds.filter(id => id !== steamId);
    fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// register the channel id at the server specified.
async function registerChannel(channelId, serverId, channelType) {
    let servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);
    if (!server) {
        server = {
            serverId: serverId,
            serverName: await getServerName(serverId),
            registeredSteamIds: [],
            registeredChannelIds: {
                match: [],
                streaks: [],
                stats: [],
                day: [],
                week: [],
                month: [],
                year: []
            }
        }
        servers.push(server);
    }
    switch (channelType) {
        case "match":
        case "streaks":
        case "stats":
        case "day":
        case "week":
        case "month":
        case "year":
            // dont need to check if theres a duplicate, as its checked beforehand.
            server.registeredChannelIds[channelType].push(channelId);
            break;
    }
    fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the registered channel of the server specified.
function removeRegisteredChannelOf(serverId, channelId, channelType) {
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredChannelIds[channelType] = server.registeredChannelIds[channelType].filter(id => id !== channelId);
    fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

async function generateBanner(matchData) {
    if (fs.existsSync(`${__dirname}/data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`)) return `${__dirname}/data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`;
    const ratio = 1.85;
    const canvas_width = 800;
    const canvas_height = Math.round(canvas_width / ratio);
    const image_width = 256;
    const image_height = 144;
    const spacing = 15;
    const circleRadius = 16;
    const canvas = createCanvas(canvas_width, canvas_height);
    const context = canvas.getContext("2d");

    // header background
    context.fillStyle = "#313338";
    context.fillRect(0, 0, canvas_width, canvas_height);
    context.fillStyle = "white";
    context.fillRect(0, 30 + spacing, canvas_width, 15);

    // game winner text
    context.font = "bold 30px Arial";
    context.fillStyle = matchData.playerSummary.playerTeamIsWin ? "green" : "red";
    context.fillText(`${matchData.matchSummary.gameWinner} Victory`, 0 + spacing, 30 + 2);

    // create radiant team part
    context.fillStyle = "green";
    context.fillRect(0, 45 + spacing, spacing, image_height * 5 / 4);

    // header text
    context.font = "bold 15px Arial";
    context.fillStyle = "black";
    context.fillText("K", 210 + image_width / 4 + spacing / 2, 20 + image_height * 0 / 4 + spacing + 20 + 3);
    context.fillText("D", 255 + image_width / 4 + spacing / 2, 20 + image_height * 0 / 4 + spacing + 20 + 3);
    context.fillText("A", 300 + image_width / 4 + spacing / 2, 20 + image_height * 0 / 4 + spacing + 20 + 3);
    context.fillText("GPM", 360 + image_width / 4 + spacing / 2 - 3, 20 + image_height * 0 / 4 + spacing + 20 + 3);
    context.fillText("LH", 445 + image_width / 4 + spacing / 2, 20 + image_height * 0 / 4 + spacing + 20 + 3);
    context.fillText("DN", 505 + image_width / 4 + spacing / 2 - 3, 20 + image_height * 0 / 4 + spacing + 20 + 3);

    for (let [i, player] of matchData.teamSummary.radiant.players.entries()) {
        const image = await loadImage(player.playerHeroIconUrl);

        // hero images (radiant)
        context.drawImage(image, 0 + spacing, 45 + image_height * i / 4 + spacing, image_width / 4, image_height / 4);

        // level circle (outline or somesort idk what its called)
        context.fillStyle = "black";
        context.beginPath();
        context.arc(5 + image_width / 4 + spacing + circleRadius, 45 + image_height * i / 4 + spacing + circleRadius + 2, (image_height / 4) / 2 - 2, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();

        // player names
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        context.fillText(player.playerName, 60 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 5);

        // level number
        context.fillStyle = "gold";
        if (player.playerHeroLevel > 9) context.fillText(player.playerHeroLevel, 5 + image_width / 4 + spacing + circleRadius / 3, 45 + image_height * i / 4 + spacing + 20 + 5);
        else context.fillText(player.playerHeroLevel, 5 + image_width / 4 + spacing + circleRadius / 1.5, 45 + image_height * i / 4 + spacing + 20 + 5);

        // KDA
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        context.fillText(player.playerKills, 210 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);
        context.fillText(player.playerDeaths, 255 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);
        context.fillText(player.playerAssists, 300 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);

        // GPM
        context.fillStyle = "gold";
        context.fillText(player.playerNet, 360 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);

        // LH
        context.fillStyle = "white";
        context.fillText(player.playerLH, 445 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);

        // DN
        context.fillText(player.playerDN, 505 + image_width / 4, 45 + image_height * i / 4 + spacing + 20 + 3);
    }

    // create dire team part
    context.fillStyle = "red";
    context.fillRect(0, 15 + canvas.height / 2 + spacing, spacing, image_height * 5 / 4);
    for (let [i, player] of matchData.teamSummary.dire.players.entries()) {
        const image = await loadImage(player.playerHeroIconUrl);

        // hero images (dire)
        context.drawImage(image, 0 + spacing, 15 + canvas.height / 2 + image_height * i / 4 + spacing, image_width / 4, image_height / 4);

        // level circle.
        context.fillStyle = "black";
        context.beginPath();
        context.arc(5 + image_width / 4 + spacing + circleRadius, 15 + canvas.height / 2 + image_height * i / 4 + spacing + circleRadius + 2, (image_height / 4) / 2 - 2, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();

        // player names
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        context.fillText(player.playerName, 60 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 5);

        // level number
        context.fillStyle = "gold";
        if (player.playerHeroLevel > 9) context.fillText(player.playerHeroLevel, 5 + image_width / 4 + spacing + circleRadius / 3, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 5);
        else context.fillText(player.playerHeroLevel, 5 + image_width / 4 + spacing + circleRadius / 1.5, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 5);

        // header text
        // done above

        // KDA
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        context.fillText(player.playerKills, 210 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);
        context.fillText(player.playerDeaths, 255 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);
        context.fillText(player.playerAssists, 300 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);

        // GPM
        context.fillStyle = "gold";
        context.fillText(player.playerNet, 360 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);

        // LH
        context.fillStyle = "white";
        context.fillText(player.playerLH, 445 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);

        // DN
        context.fillText(player.playerDN, 505 + image_width / 4, 15 + canvas.height / 2 + image_height * i / 4 + spacing + 20 + 3);
    }
    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(`${__dirname}/data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`, buffer);
    return `${__dirname}/data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`;
}

// send the game result in discord channels.
async function sendMessageToChannels(channelId, matchData, messageId=null) {
    // contruct the buttons.
    const previous = new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary);
    const next = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(previous, next);
    let attachment = new AttachmentBuilder();

    const player = matchData.playerSummary;
    console.time("generateBanner");
    try {
        attachment.setFile(await generateBanner(matchData));
        attachment.setName("banner.png");
    } catch (error) {
        attachment.setFile("${__dirname}/data/banner/ERROR_BANNER.png");
        attachment.setName("banner.png");
    }
    console.timeEnd("generateBanner")
    
    const embed = new EmbedBuilder()
        .setColor(player.playerTeamIsWin ? "Green" : "Red")
        .setTitle(`${matchData.matchSummary.gameMode} ${matchData.matchSummary.gameMatchDuration}`)
        .setAuthor({ name: player.playerName, iconURL: getSteamUserAvatar(getSteamIdByDota2Id(player.playerId)), url: `https://steamcommunity.com/profiles/${getSteamIdByDota2Id(player.playerId)}`})
        .setThumbnail(player.playerHeroIconUrl)
        .setDescription(`Player Overview\nHero : ${player.playerHeroName}\nKDA: ${player.playerKDA}\nNet: ${player.playerNet}\nLH/DN: ${player.playerLH}/${player.playerDN}\nGPM: ${player.playerGPM}\nXPM: ${player.playerXPM}`)
        .setImage("attachment://banner.png")
        .setFooter({ text: `${matchData.matchSummary.gameMatchId}`});
        
    const channel = await client.channels.fetch(channelId);
    const newMessage = await channel.send({ embeds: [embed], components: [row], files: [attachment] });

    // when button is clicked, it will send out a new message and delete the old message. (prevent spammed messages)
    if (messageId) {
        const oldMessage = await channel.messages.fetch(messageId);
        messagePlayerIds[newMessage.id] = messagePlayerIds[messageId];
        lastMatchIndex[newMessage.id] = lastMatchIndex[messageId];
        await oldMessage.delete();
    }
    else {
        messagePlayerIds[newMessage.id] = player.playerId;
        lastMatchIndex[newMessage.id] = 0;
    }
}

// send the game result of the steam id specified to the sendGameResult().
// isDuplicate - boolean to check if the match has already been sent to the channel.
// recentMatch - specific match data instead of fetching the last match data.
// messageId   - message to edit instead of sending a new message. (used in the next/previous button)
async function sendGameResult(steamId, registeredChannels, isDuplicate=true, recentMatch=null, messageId=null) {
    await Promise.all(registeredChannels.map(async (channelId) => {
        const serverId = client.channels.cache.get(channelId).guild.id;
        if (recentMatch === null) {
            if (!await isMatchHistoryPublic(steamId)) return;
            recentMatch = await getLastMatch(steamId);
        }
        
        const matchId = recentMatch.match_id;
    
        // check if the match has already been logged in the channel. Also to prevent unnecessary api calls.
        if (!lastMatchIds[matchId]) lastMatchIds[matchId] = {};
        if (!lastMatchIds[matchId][channelId]) lastMatchIds[matchId][channelId] = [];
        if (!isDuplicate && lastMatchIds[matchId][channelId].includes(steamId)) return; 
        lastMatchIds[matchId][channelId] = [...lastMatchIds[matchId][channelId], steamId];

        // fetch the match details from the api.
        const matchDetails = (await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key=${process.env.STEAM_API_KEY}&match_id=${matchId}`)).data;
        fs.writeFileSync(`${__dirname}/data/api_fetched/GMD${steamId}.json`, JSON.stringify(matchDetails), null, 4);
    
        const matchDuration = matchDetails.result.duration;
        const playerMatchDetails = matchDetails.result.players.find(player => player.account_id === parseInt(getDota2IdBySteamId(steamId)));        
        const radiantIsWin = matchDetails.result.radiant_win ? true : false;
        const playerTeamIsWin = playerMatchDetails.team_number === 0 ? radiantIsWin : !radiantIsWin;
        const teamPlayerDetails = {
            radiant: await getTeamPlayerDetailsOf("radiant", matchDetails),
            dire: await getTeamPlayerDetailsOf("dire", matchDetails),
        }
        const playerName = await getPlayerName(steamId);
        const player = teamPlayerDetails.radiant.find(player => player.playerName === playerName) || teamPlayerDetails.dire.find(player => player.playerName === playerName);

        const matchData = {
            matchSummary: {
                gameMode: gameModes[matchDetails.result.game_mode],
                gameMatchDuration: (Math.floor(matchDuration / 3600)).toString().padStart(2, "0") !== "00" ? `${(Math.floor(matchDuration / 3600)).toString().padStart(2, "0")}:${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}` : `${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}`, // lol
                gameMatchId: matchId,
                gameWinner: radiantIsWin ? "Radiant" : "Dire"
            },
            playerSummary: {
                playerName: player.playerName,
                playerHeroLevel: player.playerHeroLevel,
                playerHeroName: player.playerHeroName,
                playerKDA: `${player.playerKills}/${player.playerDeaths}/${player.playerAssists}`,
                playerNet: player.playerNet,
                playerLH: player.playerLH,
                playerDN: player.playerDN,
                playerGPM: player.playerGPM,
                playerXPM: player.playerXPM,
                
                playerHeroIconUrl: player.playerHeroIconUrl,
                playerHeroDamage: player.playerHeroDamage,
                playerTeam: player.playerTeam,

                playerTeamIsWin: playerTeamIsWin,
                playerId: parseInt(getDota2IdBySteamId(steamId))
            },
            teamSummary: {
                radiant: {
                    players: teamPlayerDetails.radiant,
                    radiantKDA: getTeamKDA(getTeamOf("radiant", matchDetails)),
                    ragiantNet: getTeamNet(getTeamOf("radiant", matchDetails)),
                    radiantDamage: getTeamDamage(getTeamOf("radiant", matchDetails)),
                    radiantIsWin: radiantIsWin
                },
                dire: {
                    players: teamPlayerDetails.dire,
                    direKDA: getTeamKDA(getTeamOf("dire", matchDetails)),
                    direNet: getTeamNet(getTeamOf("dire", matchDetails)),
                    direDamage: getTeamDamage(getTeamOf("dire", matchDetails)),
                    direIsWin: !radiantIsWin
                }
            }
        }

        // add the win/lose to the daily standings. (this is not invoked when using /match for obvious reasons)
        if (!isDuplicate) {
            if (!dailyStandings[serverId]) dailyStandings[serverId] = {};
            if (!dailyStandings[serverId][steamId]) dailyStandings[serverId][steamId] = {win: 0, lose: 0};

            if (!playerStreaks[serverId]) playerStreaks[serverId] = {};
            if (!playerStreaks[serverId][steamId]) playerStreaks[serverId][steamId] = {win: 0, lose: 0};

            if (!dailyStats[serverId]) dailyStats[serverId] = {};
            if (!dailyStats[serverId][steamId]) dailyStats[serverId][steamId] = {kills: 0, deaths: 0, assists: 0};

            dailyStats[serverId][steamId].kills += player.playerKills;
            dailyStats[serverId][steamId].deaths += player.playerDeaths;
            dailyStats[serverId][steamId].assists += player.playerAssists;

            if (playerTeamIsWin) {
                dailyStandings[serverId][steamId].win += 1;
                playerStreaks[serverId][steamId].win += 1;
                playerStreaks[serverId][steamId].lose = 0;
            }
            else {
                dailyStandings[serverId][steamId].lose += 1;
                playerStreaks[serverId][steamId].win = 0;
                playerStreaks[serverId][steamId].lose += 1;
            }
        }
        if (messageId) await sendMessageToChannels(channelId, matchData, messageId);
        else await sendMessageToChannels(channelId, matchData);
    }));
}

async function scheduleUpdateDota2Objects() {
    gameModes = await getDota2GameModes();
    dota2Heroes = await getDota2Heroes();
    dota2HeroIconsUrl = await getHeroIcons();
}

async function scheduleSendGameResults() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const steamIds = loadRegisteredSteamIdsOf(serverId);
        if(steamIds.length === 0) return;
        const registeredChannels = loadRegisteredChannelTypesOf(serverId, "match");
        if (registeredChannels.length === 0) return;

        for (const steamId of steamIds) await sendGameResult(steamId, registeredChannels, isDuplicate=false);
    }
}

async function scheduleStreaks() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await getStreaksOf(serverId, "all");
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "streaks");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const embed = new EmbedBuilder()
                .setColor("White")
                .setTitle(`Streaks Leaderboards ${getDate()}`)
                .setDescription(messageContent);
            const channel = await client.channels.fetch(channelId);
            await channel.send({ embeds: [embed]});
        }));
    }
}

async function scheduleDailyStats() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await getDailyStatsOf(serverId);
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "stats");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const embed = new EmbedBuilder()
                .setColor("White")
                .setTitle(`Daily Stats ${getDate()}`)
                .setDescription(messageContent);
            const channel = await client.channels.fetch(channelId);
            await channel.send({ embeds: [embed]});
        }));
    }
}

async function scheduleDailyStandings() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await day(serverId);

        // initialize the weeklyStandings object if it doesnt exist, then pass the dailyStandings[serverId].
        for (let steamId of loadRegisteredSteamIdsOf(serverId)) {
            if (!weeklyStandings[serverId]) weeklyStandings[serverId] = {};
            if (!weeklyStandings[serverId][steamId]) weeklyStandings[serverId][steamId] = {win: 0, lose: 0};
            if (dailyStandings[serverId] && dailyStandings[serverId][steamId]) {
                weeklyStandings[serverId][steamId].win += dailyStandings[serverId][steamId].win;
                weeklyStandings[serverId][steamId].lose += dailyStandings[serverId][steamId].lose;
                dailyStandings[serverId][steamId] = {win: 0, lose: 0};
            }
        }
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "day");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const embed = new EmbedBuilder()
                .setColor("White")
                .setTitle(`Daily Standings ${getDate()}`)
                .setDescription(messageContent)
            const channel = await client.channels.fetch(channelId);
            await channel.send({ embeds: [embed]});
        }));
    }
}

async function scheduleWeeklyStandings() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await week(serverId);

        for (let steamId of loadRegisteredSteamIdsOf(serverId)) {
            if (!monthlyStandings[serverId]) monthlyStandings[serverId] = {};
            if (!monthlyStandings[serverId][steamId]) monthlyStandings[serverId][steamId] = {win: 0, lose: 0};
            if (weeklyStandings[serverId] && weeklyStandings[serverId][steamId]) {
                monthlyStandings[serverId][steamId].win += weeklyStandings[serverId][steamId].win;
                monthlyStandings[serverId][steamId].lose += weeklyStandings[serverId][steamId].lose;
                weeklyStandings[serverId][steamId] = {win: 0, lose: 0};
            }
        }
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "week");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const channel = await client.channels.fetch(channelId);
            await channel.send(messageContent);
        }));
    }
}

async function scheduleMonthlyStandings() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await month(serverId);

        for (let steamId of loadRegisteredSteamIdsOf(serverId)) {
            if (!yearlyStandings[serverId]) yearlyStandings[serverId] = {};
            if (!yearlyStandings[serverId][steamId]) yearlyStandings[serverId][steamId] = {win: 0, lose: 0};
            if (monthlyStandings[serverId] && monthlyStandings[serverId][steamId]) {
                yearlyStandings[serverId][steamId].win += monthlyStandings[serverId][steamId].win;
                yearlyStandings[serverId][steamId].lose += monthlyStandings[serverId][steamId].lose;
                monthlyStandings[serverId][steamId] = {win: 0, lose: 0};
            }
        }
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "week");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const channel = await client.channels.fetch(channelId);
            await channel.send(messageContent);
        }));
    }
}

async function scheduleYearlyStandings() {
    for (let serverId of JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers.map(obj => obj.serverId)) {
        const messageContent = await year(serverId);

        for (let steamId of loadRegisteredSteamIdsOf(serverId)) if (yearlyStandings[serverId] && yearlyStandings[serverId][steamId]) yearlyStandings[serverId][steamId] = {win: 0, lose: 0};
        const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "year");
        await Promise.all(registeredChannelIds.map(async (channelId) => {
            const channel = await client.channels.fetch(channelId);
            await channel.send(messageContent);
        }));
    }
}

function scheduleSaveData() {
    console.log(`${getDate()} ${getTime()} - auto saving data...`)
    saveData();
    console.log(`${getDate()} ${getTime()} - auto data saved.`)
}

async function startHandler() {
    console.log(`${getDate()} ${getTime()} - loading data...`)
    initializeFolders();
    initializeFiles();
    await loadData();
    console.log(`${getDate()} ${getTime()} - data loaded.`)
}

function exitHandler() {
    console.log(`${getDate()} ${getTime()} - saving data...`)
    saveData();
    console.log(`${getDate()} ${getTime()} - data saved.`)
}

process.on("exit", exitHandler); // exit the process
process.on("SIGINT", () => { exitHandler(); process.exit(); }); // ctrl + c
process.on("SIGUSR1", () => { exitHandler(); process.exit(); }); // kill -s USR1 <pid>
process.on("SIGUSR2", () => { exitHandler(); process.exit(); }); // kill -s USR2 <pid>
process.on("uncaughtException", (err) => { console.error(err); exitHandler(); }); // uncaught exceptions

const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", async () => {
    console.log(`${getDate()} ${getTime()} - ${client.user.tag} is online.`);
    await startHandler();

    // check if the channels that are registered in server.json are still valid.
    await Promise.all(client.guilds.cache.map(async (guild) => {
        const serverId = guild.id;
        const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
        const server = servers.find(obj => obj.serverId === serverId);
        if (!server) return;

        // check each channels and remove the invalid ones.
        let registeredChannelIds = loadAllRegisteredChannelsOf(serverId);
        for (let key in registeredChannelIds) registeredChannelIds[key] = registeredChannelIds[key].filter(channelId => client.channels.cache.has(channelId));
        server.registeredChannelIds = registeredChannelIds;
        fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
    }));

    // update nescesarry dota 2 objects every 24 hours.
    cron.schedule("0 0 * * *", scheduleUpdateDota2Objects, { timezone: "Asia/Manila" }); // 24 hours

    // this fetches all the registered steam ids of all the servers.
    // it will log the new game results of each steam id, and ignore if the match has already been sent.
    // but it still uses API call to fetch new matches. So it scales with the number of registered steam ids.
    cron.schedule("10 * * * * *", scheduleSendGameResults, { timezone: "Asia/Manila" }); // 10 seconds

    // auto streaks.
    cron.schedule("0 0 * * *", scheduleStreaks, { timezone: "Asia/Manila" }); // 24 hours
    
    cron.schedule("0 0 * * *", scheduleDailyStats, { timezone: "Asia/Manila" }); // 24 hours

    // auto commands for day, week, month
    cron.schedule("0 0 * * *", scheduleDailyStandings, { timezone: "Asia/Manila" }); // 24 hours
    cron.schedule("0 0 * * 1", scheduleWeeklyStandings, { timezone: "Asia/Manila" }); // 7 days
    cron.schedule("0 0 1 * *", scheduleMonthlyStandings, { timezone: "Asia/Manila" }); // 30 days
    cron.schedule("0 0 1 1 *", scheduleYearlyStandings, { timezone: "Asia/Manila" }); // 365 days

    cron.schedule("*/1 * * * *", scheduleSaveData, { timezone: "Asia/Manila" }); // 1 minutes
});

client.on("messageDelete", async (message) => {
    if (!messagePlayerIds[message.id]) return;
    delete messagePlayerIds[message.id];
    delete lastMatchIndex[message.id];
});

client.on("guildDelete", async (guild) => {
    const serverId = guild.id;
    const servers = JSON.parse(fs.readFileSync(`${__dirname}/data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    if (!server) return;
    servers = servers.filter(obj => obj.serverId !== serverId);
    fs.writeFileSync(`${__dirname}/data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
});

client.on("channelDelete", async (channel) => {
    const channelType = loadChannelTypeOf(channel.guild.id, channel.id);
    if (!channelType) return;
    removeRegisteredChannelOf(channel.guild.id, channel.id, channelType);
})

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;
    const { commandName, options } = interaction;
    const serverId = interaction.guild.id;
    const channelId = interaction.channel.id;

    // your register a user here, either its your account or someone else, its valid.
    // so does your account id also. In this part when you /register add, it adds the id
    // on the server where you are currenyly on.
    if (commandName === "register") {
        const subCommand = options.getSubcommand();
        if (subCommand === "add") {
            await interaction.deferReply({ ephemeral: true});
            let steamId = options.getString("id");
            if (isNaN(steamId)) return await interaction.editReply("ID must be a number.");
            if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId); // convert the dota 2 id to steam id.
            if (!fs.existsSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) {
                await interaction.editReply("Invalid Steam ID.");
                return;
            }
            if (isSteamIdRegistered(steamId)) { // check all servers
                const steamIdRegisteredLocations = loadWhereSteamIdRegistered(steamId);
                await interaction.editReply(`Notice: Steam ID already registered in the following servers: ${steamIdRegisteredLocations.join(", ")}`);
            }
            if (isSteamIdRegisteredAt(interaction.guild.id, steamId)) return;
            await registerSteamId(steamId, serverId);
            await interaction.followUp("Steam ID registered successfully.");
        }
        else if (subCommand === "remove") {
            await interaction.deferReply({ ephemeral: true});
            let steamId = options.getString("id");
            if (isNaN(steamId)) return await interaction.editReply("ID must be a number.");

            if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId); // conver the dota 2 id to steam id.
            if (!fs.existsSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) await interaction.editReply("Invalid Steam ID.");
            else if (!isSteamIdRegisteredAt(interaction.guild.id, steamId)) await interaction.editReply("Steam ID not registered on this server.");
            else {
                removeRegisteredSteamIdOf(serverId, steamId);
                await interaction.editReply("Steam ID unregistered successfully.");
            }
        }
        else if (subCommand === "list") {
            await interaction.deferReply({ ephemeral: true});
            const userType = options.getString("type") || "all";
            const registeredSteamIds = loadRegisteredSteamIdsOf(serverId);
            if (registeredSteamIds.length === 0) return await interaction.editReply("No Steam IDs are registered on this server.");
            
            let message = "";
            let dota2IdPadding = Math.max(...registeredSteamIds.map(id => getDota2IdBySteamId(id).length)) + 8;
            let steamIdPadding = Math.max(...registeredSteamIds.map(id => id.length)) + 8;
            for (let steamId of registeredSteamIds) {
                const isHistoryPublic = await isMatchHistoryPublic(steamId);
                const playerName = await getPlayerName(steamId);
                const dota2Id = getDota2IdBySteamId(steamId);
                if (userType === "all") message += `${dota2Id.padEnd(dota2IdPadding)}${steamId.padEnd(steamIdPadding)}${playerName}\n`;
                else if (userType === "public" && isHistoryPublic) message += `${dota2Id.padEnd(dota2IdPadding)}${steamId.padEnd(steamIdPadding)}${playerName}\n`;
                else if (userType === "private" && !isHistoryPublic) message += `${dota2Id.padEnd(dota2IdPadding)}${steamId.padEnd(steamIdPadding)}${playerName}\n`;
            }
            await interaction.editReply(`\`\`\`${"Dota 2 Id".padEnd(dota2IdPadding)}${"Steam Id".padEnd(steamIdPadding)}Player name\n${message}\`\`\``);
        }
    }
    else if (commandName === "leaderboards") {
        await interaction.deferReply();

        // might not work on all servers as it needs to have a reserved discord emoji space for the
        // rank medals emojis.
        let messageContent = await getLeaderboardsOf(serverId);
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle("Rank Leaderboards")
            .setDescription(messageContent);
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "dailystats") {
        await interaction.deferReply({ ephemeral: true});
        const messageContent = await getDailyStatsOf(serverId);
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle("Daily Statistics")
            .setDescription(messageContent);
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "streaks") {
        await interaction.deferReply({ ephemeral: true});
        let messageContent = "";
        const streakType = options.getString("type") || "all";
        if (streakType === "win") messageContent = await getStreaksOf(serverId, "win");
        else if (streakType === "lose") messageContent = await getStreaksOf(serverId, "lose");
        else messageContent = await getStreaksOf(serverId, "all");
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle("Streaks Leaderboards")
            .setDescription(messageContent);
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "channels") {
        await interaction.deferReply({ ephemeral: true});
        const registeredChannelIds = loadAllRegisteredChannelsOf(serverId);
        if (Object.keys(registeredChannelIds).length === 0) return await interaction.editReply("No channels registered on this server.");

        const matchChannels = registeredChannelIds["match"].map(id => client.channels.cache.get(id).name);
        const streaksChannels = registeredChannelIds["streaks"].map(id => client.channels.cache.get(id).name);
        const statsChannels = registeredChannelIds["stats"].map(id => client.channels.cache.get(id).name);
        const dayChannels = registeredChannelIds["day"].map(id => client.channels.cache.get(id).name);
        const weekChannels = registeredChannelIds["week"].map(id => client.channels.cache.get(id).name);
        const monthChannels = registeredChannelIds["month"].map(id => client.channels.cache.get(id).name);
        const yearChannels = registeredChannelIds["year"].map(id => client.channels.cache.get(id).name);
        const channelNames = `\`\`\`${"Match".padEnd(9)}${matchChannels.join(", ")}\n${"Streaks".padEnd(9)}${streaksChannels.join(", ")}\n${"Daily Stats".padEnd(9)}${statsChannels.join(", ")}\n${"Day".padEnd(9)}${dayChannels.join(", ")}\n${"Week".padEnd(9)}${weekChannels.join(", ")}\n${"Month".padEnd(9)}${monthChannels.join(", ")}\n${"Year".padEnd(9)}${yearChannels.join(", ")}\`\`\``;
        await interaction.editReply(channelNames);
    }
    else if (commandName === "setchannel") {
        await interaction.deferReply({ ephemeral: true});
        const channelType = options.getString("type");
        if (!interaction.member.permissions.has("1221426032817733662")) return await interaction.editReply("You must be an admin to set a channel.");
        if (isChannelRegisteredAt(serverId, channelId, channelType)) return await interaction.editReply("Channel already registered.");
        
        switch (channelType) {
            case "match":
            case "streaks":
            case "stats":
            case "day":
            case "week":
            case "month":
            case "year":
                await interaction.editReply(`Channel set as auto /${channelType}.`);
                await registerChannel(channelId, serverId, channelType);
                break;
            default:
                await interaction.editReply("Invalid channel type.");
                break;
        }
    }
    else if (commandName === "unsetchannel") {
        await interaction.deferReply({ ephemeral: true});
        const channelType = loadChannelTypeOf(serverId, channelId);
        if (!interaction.member.permissions.has("1221426032817733662")) await interaction.editReply("You must be an admin to unset a channel.");
        else if (!isChannelRegisteredAt(serverId, channelId, channelType)) await interaction.editReply("Channel is not registered.");
        else {
            removeRegisteredChannelOf(serverId, channelId, channelType);
            await interaction.editReply("Channel unregistered successfully.");
        }
    }
    else if (commandName === "help") {
        await interaction.reply({ content: `**Slash Commands**
        \n**/help**
        \t\tSends a help message on how to use the bot.
        \n**/channels**
        \t\tList all the registered channels on this server.
        \n**/setchannel type <match | streaks | stats | day | week | month | year>**
        \t\tSet the channel for logging messages. Must be on the channel you want to set. (admin only)
        \n**/unsetchannel**
        \t\tRemove the channel for logging messages. Must be on the channel you want to remove. (admin only)
        \n**/register add <id>**
        \t\tRegister a user.
        \n**/register remove <id>**
        \t\tRemove the registered user.
        \n**/register list [<all | public | private>]**
        \t\tList registered users. Leave the option blank and it will output all users.
        \n**/match <id>**
        \t\tGet the most recent match of the user.
        \n**/streaks [<win | lose | all>]**
        \t\tGet the daily stats of the server.
        \n**/dailystats**
        \t\tTo enter the streak rank, user must be >= 3 of win/lose streak. Default value without the type will output both win and lose streak.
        \n**/day**
        \t\tGet the daily standings on the server.
        \n**/week**
        \t\tGet the weekly standings on the server.
        \n**/month**
        \t\tGet the monthly standings on the server.
        \n**/year**
        \t\tGet the yearly standings on the server.
        \n**/dota2id <id>**
        \t\tConvert a valid Steam ID to its Dota 2 ID.
        \n**/steamid <id>**
        \t\tConvert the Dota 2 ID to its Steam ID. Only convert the Dota 2 ID to its Steam ID equivalent.
        \n**/verifyid <id>**
        \t\tCheck if the Steam ID is valid.

        > auto /day, /week, /month and /year resets every 00:00 GMT+8.
        `, ephemeral: true});
    }
    else if (commandName === "match") {
        await interaction.deferReply({ ephemeral: true});
        let steamId = options.getString("id");
        if (isNaN(steamId)) return await interaction.editReply("ID must be a number.");

        if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId);
        if (!isSteamIdRegisteredAt(serverId, steamId)) await interaction.editReply("Steam ID not registered on this server.");
        else if (!await isMatchHistoryPublic(steamId)) await interaction.editReply("Match history is private.");
        else await sendGameResult(steamId, [channelId], isDuplicate=true);
    }
    // the rest are auto commands.
    else if (commandName === "day") {
        await interaction.deferReply({ ephemeral: true});
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle(`Daily Standings ${getDate()}`)
            .setDescription(await day(serverId));
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "week") {
        await interaction.deferReply({ ephemeral: true});
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle(`Weekly Standings ${getDate()}`)
            .setDescription(await week(serverId));
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "month") {
        await interaction.deferReply({ ephemeral: true});
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle(`Monthly Standings ${getDate()}`)
            .setDescription(await month(serverId));
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "year") {
        await interaction.deferReply({ ephemeral: true});
        const embed = new EmbedBuilder()
            .setColor("White")
            .setTitle(`Yearly Standings ${getDate()}`)
            .setDescription(await year(serverId));
        await interaction.editReply({ embeds: [embed]});
    }
    else if (commandName === "dota2id") {
        const steamId = options.getString("id");
        if (isNaN(steamId)) return await interaction.reply({ content: "ID must be a number.", ephemeral: true});
        if (steamId.length !== 17) return await interaction.reply({ content: "Invalid Steam ID length. (must be 17 digits)", ephemeral: true});
        else await interaction.reply({ content: getDota2IdBySteamId(steamId), ephemeral: true});
    }
    else if (commandName === "steamid") {
        const dota2Id = options.getString("id");
        if (isNaN(dota2Id)) return await interaction.reply({ content: "ID must be a number.", ephemeral: true});
        else await interaction.reply({ content: getSteamIdByDota2Id(dota2Id), ephemeral: true});
    }
    else if (commandName === "verifyid") {
        await interaction.deferReply({ ephemeral: true});
        const steamId = options.getString("id");
        if (isNaN(steamId)) return await interaction.editReply("ID must be a number.");
        if (steamId.length !== 17) return await interaction.editReply("Invalid Steam ID length. (must be 17 digits)");
        else if (!fs.existsSync(`${__dirname}/data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) await interaction.editReply("Invalid Steam ID.");
        else await interaction.editReply(`The provided Steam ID is valid. You can view the profile at: https://steamcommunity.com/profiles/${steamId}`);
    }
    else if (interaction.isButton()) {
        const steamId = interaction.message.embeds[0].author.url.replace("https://steamcommunity.com/profiles/", "");
        if (!await isMatchHistoryPublic(steamId)) return await interaction.followUp({ content: "Match history is private.", ephemeral: true });

        const messageId = interaction.message.id;
        let currentIndex = lastMatchIndex[messageId] || 0;

        const buttons = interaction.message.components[0].components;
        const disabledButtons = buttons.map(button => 
            new ButtonBuilder()
                .setCustomId(button.customId)
                .setLabel(button.label)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        const row = new ActionRowBuilder().addComponents(disabledButtons);

        // imagine this as undo and redo buttons.
        // this button will browse to the older match history of the player.
        if (interaction.customId === "previous") {
            if (currentIndex === 100) return await interaction.reply({ content: "No more match history to show.", ephemeral: true });
            else currentIndex += 1;

            await interaction.update({ components: [row] });
            lastMatchIndex[messageId] = currentIndex;
            const previousMatch = await getMatchIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, previousMatch, messageId);
        }
        // this button will browse to the newer match history of the player.
        else if (interaction.customId === "next") {
            if (currentIndex === 0) return await interaction.reply({ content: "No more match history to show.", ephemeral: true });
            else currentIndex -= 1;

            await interaction.update({ components: [row] });
            lastMatchIndex[messageId] = currentIndex;
            const nextMatch = await getMatchIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, nextMatch, messageId);
        }
    }
});

client.login(process.env.TOKEN);