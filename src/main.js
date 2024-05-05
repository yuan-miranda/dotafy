const fs = require("fs");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
require("dotenv").config();

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

// list of win/lose.
// key: serverId, value {steamId: {win: 0, lose: 0}}
let dailyStandings = {};
let weeklyStandings = {};
let monthlyStandings = {};

// retun the daily standing of the server specified.
async function day(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!dailyStandings[serverId]) dailyStandings[serverId] = {};
        if (!dailyStandings[serverId][steamId]) dailyStandings[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in dailyStandings[serverId]) {
        output += `(${getDota2IdBySteamId(user)}) ${await getPlayerName(user)} - ${dailyStandings[serverId][user].win}W ${dailyStandings[serverId][user].lose}L\n`;
    }
    return `Daily Standing:\n${output}`;
}

// return the weekly standing of the server specified.
async function week(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!weeklyStandings[serverId]) weeklyStandings[serverId] = {};
        if (!weeklyStandings[serverId][steamId]) weeklyStandings[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in weeklyStandings[serverId]) {
        output += `(${getDota2IdBySteamId(user)}) ${await getPlayerName(user)} - ${weeklyStandings[serverId][user].win}W ${weeklyStandings[serverId][user].lose}L\n`;
    }
    return `Weekly Standing:\n${output}`;
}

// return the monthly standing of the server specified.
async function month(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!monthlyStandings[serverId]) monthlyStandings[serverId] = {};
        if (!monthlyStandings[serverId][steamId]) monthlyStandings[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in monthlyStandings[serverId]) {
        output += `(${getDota2IdBySteamId(user)}) ${await getPlayerName(user)} - ${monthlyStandings[serverId][user].win}W ${monthlyStandings[serverId][user].lose}L\n`;
    }
    return `Weekly Standing:\n${output}`;
}

// return the most recent match played.
async function getLastMatch(steamId) {
    return JSON.parse(fs.readFileSync(`./data/api_fetched/GMH${steamId}.json`)).result.matches[0];
}

// return the match data of the index specified from getLast100Match().
async function getMatchIndex(index, steamId) {
    return JSON.parse(fs.readFileSync(`./data/api_fetched/GMH${steamId}.json`)).result.matches[index];
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
            playerKDA: `${player.kills}/${player.deaths}/${player.assists}`,
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
    return JSON.parse(fs.readFileSync(`./data/api_fetched/GPS${steamId}.json`)).response.players[0].avatar;
}

// return the list of dota 2 heroes.
async function getDota2Heroes() {
    const response = await axios.get('https://api.opendota.com/api/heroes');
    const heroNames = response.data.map(hero => [
        hero.localized_name,
        hero.name.replace("npc_dota_hero_", "")
    ]);
    let heroObjects = {};
    for (let i = 0; i < heroNames.length; i++) heroObjects[i + 2] = heroNames[i]; // idk how but indexing of dota 2 heroes are 2 based.
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
    if (!fs.existsSync(`./data/api_fetched/GPS${steamId}.json`)) await isSteamIdValid(steamId); // write the GetPlayerSummaries data to the file.
    const playerData = JSON.parse(fs.readFileSync(`./data/api_fetched/GPS${steamId}.json`));
    return playerData.response.players[0].personaname;
}

// return the last 100 matches played by the user.
async function isMatchHistoryPublic(steamId) {
    const matchHistory = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key=${process.env.STEAM_API_KEY}&account_id=${steamId}&matches_requested=100`);
    fs.writeFileSync(`./data/api_fetched/GMH${steamId}.json`, JSON.stringify(matchHistory.data, null, 4));
    return matchHistory.data.result.status !== 15; // match history is private.
}

// check if the steam id is valid.
async function isSteamIdValid(steamId){
    if (steamId.length !== 17) return false;
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`);
    if (response.data.response.players.length === 0) return false;
    fs.writeFileSync(`./data/api_fetched/GPS${steamId}.json`, JSON.stringify(response.data, null, 4));
    return true;
}

// check if the steam id is stored at the specified server.
function isSteamIdRegisteredAt(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds.includes(steamId) : false;
}

// check if the steam id is stored in any server.
function isSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    return servers.some(obj => obj.registeredSteamIds.includes(steamId));
}

// check if the channel is registered at the server specified.
function isChannelRegisteredAt(serverId, channelId, channelType) {
    if (channelType === "") return false;
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds[channelType].includes(channelId) : false;
}

// load the server ids where the steam id is registered.
function loadWhereSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const filteredServers = servers.filter(obj => obj.registeredSteamIds.includes(steamId));
    return filteredServers.map(obj => obj.serverId);
}

// laod all the registered channels of the server specified.
function loadRegisteredChannelTypesOf(serverId, channelType) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds[channelType] : [];
}
// return all the registered channels of the server specified in object form.
function loadAllRegisteredChannelsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
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
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds : [];
}

// load the channel type of the channel id specified.
function loadChannelTypeOf(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? Object.keys(server.registeredChannelIds).find(key => server.registeredChannelIds[key].includes(channelId)) || "" : "";
}

// initialize the servers.json file and the initial folder structure.
function initalizeServerJsonFile() {
    fs.mkdirSync(`./data/server`, { recursive: true }, () => {});
    fs.mkdirSync(`./data/api_fetched`, { recursive: true }, () => {});
    fs.mkdirSync(`./data/banner`, { recursive: true }, () => {});
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: []}, null, 4));
}

// register the steam id and also channels that are registered in the server specified. (if there are any)
function registerSteamId(steamId, serverId) {
    let servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    // if the server object doesnt exist, initialize a new one.
    if (!server) {
        server = {
            serverId: serverId,
            registeredSteamIds: [],
            registeredChannelIds: {
                all: [],
                match: [],
                day: [],
                week: [],
                month: []
            }
        }
        servers.push(server);
    }
    server.registeredSteamIds.push(steamId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the registerd steam id of the server specified.
function removeRegisteredSteamIdOf(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredSteamIds = server.registeredSteamIds.filter(id => id !== steamId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// register the channel id at the server specified.
function registerChannel(channelId, serverId, channelType) {
    let servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    if (!server) {
        server = {
            serverId: serverId,
            registeredSteamIds: [],
            registeredChannelIds: {
                all: [],
                match: [],
                day: [],
                week: [],
                month: []
            }
        }
        servers.push(server);
    }
    switch (channelType) {
        case "all":
        case "match":
        case "day":
        case "week":
        case "month":
            // dont need to check if theres a duplicate, as its checked beforehand.
            server.registeredChannelIds[channelType].push(channelId);
            break;
    }
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the registered channel of the server specified.
function removeRegisteredChannelOf(serverId, channelId, channelType) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredChannelIds[channelType] = server.registeredChannelIds[channelType].filter(id => id !== channelId);
    // server.registeredChannelIds = server.registeredChannelIds.filter(id => id !== channelId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

async function generateBanner(matchData) {
    if (fs.existsSync(`./data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`)) return `./data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`;

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
    context.fillRect        (0,           45 + spacing, spacing, image_height * 5 / 4);

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
    context.fillRect        (0,           15 + canvas.height / 2 + spacing, spacing, image_height * 5 / 4);

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
    fs.writeFileSync(`./data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`, buffer);
    return `./data/banner/BANNER${matchData.matchSummary.gameMatchId}.png`;
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
    
    const player = matchData.playerSummary;

    const attachment = new AttachmentBuilder()
        .setFile(await generateBanner(matchData))
        .setName("banner.png");

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
        await oldMessage.delete();
        
        messagePlayerIds[newMessage.id] = messagePlayerIds[messageId];
        lastMatchIndex[newMessage.id] = lastMatchIndex[messageId];
        delete lastMatchIndex[messageId];
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
        if (!lastMatchIds[matchId]) lastMatchIds[matchId] = []
        if (!isDuplicate && lastMatchIds[matchId].includes(channelId)) return; // if isDuplicate is false, it will prevent from sending the same match to the same channel.
        lastMatchIds[matchId] = [...lastMatchIds[matchId], channelId];

        const matchDetails = (await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key=${process.env.STEAM_API_KEY}&match_id=${matchId}`)).data;
        fs.writeFileSync(`./data/api_fetched/GMD${steamId}.json`, JSON.stringify(matchDetails), null, 4);
    
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
                playerKDA: player.playerKDA,
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
            if (playerTeamIsWin) dailyStandings[serverId][steamId].win += 1; // win
            else dailyStandings[serverId][steamId].lose += 1;                // lose
        }
        if (messageId) await sendMessageToChannels(channelId, matchData, messageId);
        else await sendMessageToChannels(channelId, matchData);
    }));
}

/* ==================================================================================================== */
// The following code is for the Discord bot.

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
    console.log(`${client.user.tag} is online.`);

    if (!fs.existsSync(`./data/server/servers.json`)) initalizeServerJsonFile();

    gameModes = await getDota2GameModes();
    dota2Heroes = await getDota2Heroes();
    dota2HeroIconsUrl = await getHeroIcons();

    // check if the channels that are registered in server.json are still valid.
    await Promise.all(client.guilds.cache.map(async (guild) => {
        const serverId = guild.id;
        const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
        const server = servers.find(obj => obj.serverId === serverId);
        
        if (!server) return;
        let registeredChannelIds = loadAllRegisteredChannelsOf(serverId);
        // check each channels and remove the invalid ones.
        for (let key in registeredChannelIds) registeredChannelIds[key] = registeredChannelIds[key].filter(channelId => client.channels.cache.has(channelId));
        server.registeredChannelIds = registeredChannelIds;
        fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
    }));

    // this fetches all the registered steam ids of all the servers.
    // in this setInterval(), it will log the game results of each steam id.
    // interval is set to 30 minutes. (average game duration of dota 2 matches)
    setInterval(async() => {
        await Promise.all(client.guilds.cache.map(async (guild) => { // each server
            const steamIds = loadRegisteredSteamIdsOf(guild.id);
            const channelType = "match";

            if(steamIds.length === 0) return;
            const registeredChannels = loadRegisteredChannelTypesOf(guild.id, channelType);
            if (registeredChannels.length === 0) return;
            for (const steamId of steamIds) {
                await sendGameResult(steamId, registeredChannels, isDuplicate=false);
            }
        }));
    }, 1000 * 60 * 30); // 30 minutes    
    
    // let counter = 0;
    // setInterval(async() => { 
    //     counter++;
    //     console.log(counter);
    // }, 1000);

    // update nescesarry dota 2 objects every 24 hours.
    setInterval(async() => {
        gameModes = await getDota2GameModes();
        dota2Heroes = await getDota2Heroes();
        dota2HeroIconsUrl = await getHeroIcons();
    }, 1000 * 60 * 60 * 24); // 24 hours

    // auto commands for day, week, month
    setInterval(async() => {
        await Promise.all(client.guilds.cache.map(async (guild) => {
            const serverId = guild.id;
            const messageContent = await day(serverId);

            await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
                if (!weeklyStandings[serverId]) weeklyStandings[serverId] = {};
                if (!weeklyStandings[serverId][steamId]) weeklyStandings[serverId][steamId] = {win: 0, lose: 0};
                if (dailyStandings[serverId] && dailyStandings[serverId][steamId]) {
                    weeklyStandings[serverId][steamId].win += dailyStandings[serverId][steamId].win;
                    weeklyStandings[serverId][steamId].lose += dailyStandings[serverId][steamId].lose;

                    delete dailyStandings[serverId][steamId];
                    if (Object.keys(dailyStandings[serverId]).length === 0) delete dailyStandings[serverId];
                }
            }));
            const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "day");
            await Promise.all(registeredChannelIds.map(async (channelId) => {
                const channel = await client.channels.fetch(channelId);
                await channel.send(messageContent);
            }));
        }));
    }, 1000 * 60 * 60 * 24); // 24 hours 

    setInterval(async() => {
        await Promise.all(client.guilds.cache.map(async (guild) => {
            const serverId = guild.id;
            const messageContent = await week(serverId);

            await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
                if (!monthlyStandings[serverId]) monthlyStandings[serverId] = {};
                if (!monthlyStandings[serverId][steamId]) monthlyStandings[serverId][steamId] = {win: 0, lose: 0};
                if (weeklyStandings[serverId] && weeklyStandings[serverId][steamId]) {
                    monthlyStandings[serverId][steamId].win += weeklyStandings[serverId][steamId].win;
                    monthlyStandings[serverId][steamId].lose += weeklyStandings[serverId][steamId].lose;

                    delete weeklyStandings[serverId][steamId];
                    if (Object.keys(weeklyStandings[serverId]).length === 0) delete weeklyStandings[serverId];
                }
            }));
            const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "week");
            await Promise.all(registeredChannelIds.map(async (channelId) => {
                const channel = await client.channels.fetch(channelId);
                await channel.send(messageContent);
            }));
        }));
    }, 1000 * 60 * 60 * 24 * 7); // 7 days 

    setInterval(async() => {
        setTimeout(async() => {
            await Promise.all(client.guilds.cache.map(async (guild) => {
                const serverId = guild.id;
                const messageContent = await month(serverId);
                
                await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
                    if (monthlyStandings[serverId] && monthlyStandings[serverId][steamId]) {
                        delete monthlyStandings[serverId][steamId];
                        if (Object.keys(monthlyStandings[serverId]).length === 0) delete monthlyStandings[serverId];
                    }
                }));
                const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "month");
                await Promise.all(registeredChannelIds.map(async (channelId) => {
                    const channel = await client.channels.fetch(channelId);
                    await channel.send(messageContent);
                }));
            }));
        }, 1000 * 60 * 60 * 24 * 15); // 30 days 
    }, 1000 * 60 * 60 * 24 * 15);
});

client.on("messageDelete", async (message) => {
    if (messagePlayerIds[message.id]) {
        delete messagePlayerIds[message.id];
        delete lastMatchIndex[message.id];
    }
});

client.on("channelDelete", async (channel) => {
    const channelType = loadChannelTypeOf(channel.guild.id, channel.id);
    removeRegisteredChannelOf(channel.guild.id, channel.id, channelType);
})

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;
    const { commandName, options } = interaction;

    // your register a user here, either its your account or someone else, its valid.
    // so does your account id also. In this part when you /register add, it adds the id
    // on the server where you are currenyly on.
    if (commandName === "register") {
        const subCommand = options.getSubcommand();
        if (subCommand === "add") {
            await interaction.deferReply();
            let steamId = options.getString("id");
            const serverId = interaction.guild.id;
            
            if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId); // convert the dota 2 id to steam id.
            if (!fs.existsSync(`./data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) {
                await interaction.editReply("Error: Invalid Steam ID.");
                return;
            }
            if (isSteamIdRegistered(steamId)) { // check all servers
                const steamIdRegisteredLocations = loadWhereSteamIdRegistered(steamId);
                await interaction.editReply(`Notice: Steam ID already registered in the following servers: ${steamIdRegisteredLocations.join(", ")}`);
            }
            if (isSteamIdRegisteredAt(interaction.guild.id, steamId)) { // check only in the server
                await interaction.followUp("Error: Steam ID already registered in this server.");
                return;
            }

            registerSteamId(steamId, serverId);
            await interaction.followUp("Steam ID registered successfully.");
        }
        else if (subCommand === "remove") {
            await interaction.deferReply();
            let steamId = options.getString("id");
            const serverId = interaction.guild.id;

            if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId); // conver the dota 2 id to steam id.
            if (!fs.existsSync(`./data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) await interaction.editReply("Error: Invalid Steam ID.");
            else if (!isSteamIdRegisteredAt(interaction.guild.id, steamId)) await interaction.editReply("Error: Steam ID not registered on this server.");
            else {
                removeRegisteredSteamIdOf(serverId, steamId);
                await interaction.editReply("Steam ID unregistered successfully.");
            }
        }
        else if (subCommand === "list") {
            await interaction.deferReply();
            const userType = options.getString("type") || "all";
            const serverId = interaction.guild.id;
            const registeredSteamIds = loadRegisteredSteamIdsOf(serverId);
            
            if (registeredSteamIds.length === 0) {
                await interaction.editReply("Error: No Steam IDs are registered on this server.");
                return;
            }
            
            let message = "";
            for (let steamId of registeredSteamIds) {
                const isHistoryPublic = await isMatchHistoryPublic(steamId);
                if (userType === "all") message += `(${getDota2IdBySteamId(steamId)}) ${await getPlayerName(steamId)}\n`;
                else if (userType === "public" && isHistoryPublic) message += `(${getDota2IdBySteamId(steamId)}) ${await getPlayerName(steamId)}\n`;
                else if (userType === "private" && !isHistoryPublic) message += `(${getDota2IdBySteamId(steamId)}) ${await getPlayerName(steamId)}\n`;
            }
            await interaction.editReply(message);
        }
    }
    else if (commandName === "channels") {
        await interaction.deferReply();
        const serverId = interaction.guild.id;
    
        if (loadAllRegisteredChannelsOf(serverId).length === 0) {
            await interaction.editReply("Error: No channels registered on this server.");
            return;
        }

        const registeredChannelIds = loadAllRegisteredChannelsOf(serverId);
        const allChannels = registeredChannelIds["all"].map(id => client.channels.cache.get(id).name);
        const matchChannels = registeredChannelIds["match"].map(id => client.channels.cache.get(id).name);
        const dayChannels = registeredChannelIds["day"].map(id => client.channels.cache.get(id).name);
        const weekChannels = registeredChannelIds["week"].map(id => client.channels.cache.get(id).name);
        const monthChannels = registeredChannelIds["month"].map(id => client.channels.cache.get(id).name);
        const channelNames = `Registered Channels:\n All: ${allChannels.join(", ")}\n Match: ${matchChannels.join(", ")}\n Day: ${dayChannels.join(", ")}\n Week: ${weekChannels.join(", ")}\n Month: ${monthChannels.join(", ")}`;
        await interaction.editReply(channelNames);
    }
    else if (commandName === "setchannel") {
        await interaction.deferReply();

        if (!interaction.member.permissions.has("1221426032817733662")) {
            await interaction.editReply("Error: You must be an admin to set a channel.");
            return;
        }

        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;
        const channelType = options.getString("type");

        if (isChannelRegisteredAt(serverId, channelId, channelType)) {
            await interaction.editReply("Error: Channel already registered.");
            return;
        }
        
        switch (channelType) {
            case "all":
            case "match":
            case "day":
            case "week":
            case "month":
                await interaction.editReply(`Channel set as auto /${channelType}.`);
                registerChannel(channelId, serverId, channelType);
                break;
            default:
                await interaction.editReply("Error: Invalid channel type.");
                break;
        }
    }
    else if (commandName === "unsetchannel") {
        await interaction.deferReply();
        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;
        const channelType = loadChannelTypeOf(serverId, channelId);

        if (!interaction.member.permissions.has("1221426032817733662")) await interaction.editReply("Error: You must be an admin to unset a channel.");
        else if (!isChannelRegisteredAt(serverId, channelId, channelType)) await interaction.editReply("Error: Channel is not registered.");
        else {
            removeRegisteredChannelOf(serverId, channelId, channelType);
            await interaction.editReply("Channel unregistered successfully.");
        }
    }
    // temporary help command, will be updated later.
    else if (commandName === "help") {
        await interaction.deferReply();
        await interaction.editReply("```Slash Commands:\n/register add <id>\n/register remove <id>\n/register list\n/channels\n/setchannel\n/unsetchannel\n/help```");
    }
    else if (commandName === "all") {
        // what does this do?
    }
    else if (commandName === "match") {
        const serverId = interaction.guild.id;
        const channelId = interaction.channel.id;
        let steamId = options.getString("id");
        if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId);
        if (!isSteamIdRegisteredAt(serverId, steamId)) await interaction.reply("Error: Steam ID not registered on this server.");
        else if (!await isMatchHistoryPublic(steamId)) await interaction.reply("Error: Match history is private.");
        else await sendGameResult(steamId, [channelId], isDuplicate=true);
    }
    // the rest are auto commands.
    else if (commandName === "day") {
        const serverId = interaction.guild.id;
        const output = await day(serverId);
        await interaction.reply(output);
    }
    else if (commandName === "week") {
        const serverId = interaction.guild.id;
        const output = await week(serverId);
        await interaction.reply(output);
    }
    else if (commandName === "month") {
        const serverId = interaction.guild.id;
        const output = await month(serverId);
        await interaction.reply(output);
    }
    else if (commandName === "dota2id") {
        const steamId = options.getString("id");
        if (steamId.length !== 17) await interaction.reply("Error: Invalid Steam ID length. (must be 17 digits)");
        else await interaction.reply(getDota2IdBySteamId(steamId));
    }
    else if (commandName === "steamid") {
        const dota2Id = options.getString("id");
        await interaction.reply(getSteamIdByDota2Id(dota2Id));
    }
    else if (commandName === "verifyid") {
        const steamId = options.getString("id");
        if (steamId.length !== 17) await interaction.reply("Error: Invalid Steam ID length. (must be 17 digits)");
        else if (!fs.existsSync(`./data/api_fetched/GPS${steamId}.json`) && !await isSteamIdValid(steamId)) await interaction.reply("Error: Invalid Steam ID.");
        else await interaction.reply("Steam ID is invalid.");
    }
    else if (interaction.isButton()) {
        const steamId = interaction.message.embeds[0].author.url.replace("https://steamcommunity.com/profiles/", "");
        if (!await isMatchHistoryPublic(steamId)) await interaction.followUp({ content: "Error: Match history is private.", ephemeral: true });

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
            if (currentIndex === 100) {
                await interaction.reply({ content: "Error: No more match history to show.", ephemeral: true });
                return;
            }
            else currentIndex += 1;

            await interaction.update({ components: [row] });
            lastMatchIndex[messageId] = currentIndex;
            const previousMatch = await getMatchIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, previousMatch, messageId);
        }
        // this button will browse to the newer match history of the player.
        else if (interaction.customId === "next") {
            if (currentIndex === 0) {
                await interaction.reply({ content: "Error: No more match history to show.", ephemeral: true });
                return;
            }
            else currentIndex -= 1;

            await interaction.update({ components: [row] });
            lastMatchIndex[messageId] = currentIndex;
            const nextMatch = await getMatchIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, nextMatch, messageId);
        }
    }
});

client.login(process.env.TOKEN);