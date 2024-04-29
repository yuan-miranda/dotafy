const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

let lastMatchId = {};
let lastIndexOnMatchHistory = {};
let dota2Heroes = {};
let gameModes = {};

// key: serverId, value {steamId: {win: 0, lose: 0}}
let dayMatchHistory = {};
async function day(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!dayMatchHistory[serverId]) dayMatchHistory[serverId] = {};
        if (!dayMatchHistory[serverId][steamId]) dayMatchHistory[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in dayMatchHistory[serverId]) {
        output += `${user} - ${dayMatchHistory[serverId][user].win}W ${dayMatchHistory[serverId][user].lose}L\n`;
    }
    return `Day Match History:\n${output}`;
}

// key: serverId, value (steamId: {win: 0, lose: 0})
let weekMatchHistory = {};
async function week(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!weekMatchHistory[serverId]) weekMatchHistory[serverId] = {};
        if (!weekMatchHistory[serverId][steamId]) weekMatchHistory[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in weekMatchHistory[serverId]) {
        output += `${user} - ${weekMatchHistory[serverId][user].win}W ${weekMatchHistory[serverId][user].lose}L\n`;
    }
    return `Week Match History:\n${output}`;
}

// key: serverId, value (steamId: {win: 0, lose: 0})
let monthMatchHistory = {};
async function month(serverId) {
    await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
        if (!monthMatchHistory[serverId]) monthMatchHistory[serverId] = {};
        if (!monthMatchHistory[serverId][steamId]) monthMatchHistory[serverId][steamId] = {win: 0, lose: 0};
    }));
    let output = "";
    for (let user in monthMatchHistory[serverId]) {
        output += `${user} - ${monthMatchHistory[serverId][user].win}W ${monthMatchHistory[serverId][user].lose}L\n`;
    }
    return `Month Match History:\n${output}`;
}

function isMatchHistoryPublic(matchData) {
    return matchData.status !== 15; // match history is private.
}

async function getLast100MatchHistory(steamId) {
    const matchHistory = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key=${process.env.STEAM_API_KEY}&account_id=${steamId}&matches_requested=100`);
    fs.writeFileSync(`./data/api_fetched/GMH${steamId}.json`, JSON.stringify(matchHistory.data, null, 4));
    return matchHistory.data.result.matches;
}

async function getLastMatchHistory(steamId) {
    const matchHistory = await getLast100MatchHistory(steamId);
    return matchHistory[0];
}

async function getMatchHistoryIndex(index, steamId) {
    const matchHistory = await getLast100MatchHistory(steamId);
    return matchHistory[index];
}

// check if the steam id is valid.
async function isSteamIdValid(steamId){
    if (steamId.length !== 17) return false;
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`);

    if (response.data.response.players.length === 0) return false;
    fs.writeFileSync(`./data/api_fetched/GPS${steamId}.json`, JSON.stringify(response.data, null, 4));
    return true;
}

// check if the steam id is stored at the specified server object.
function isSteamIdRegisteredAt(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds.includes(steamId) : false;
}

// check if the steam id is stored in any server object.
function isSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    return servers.some(obj => obj.registeredSteamIds.includes(steamId));
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

// initialize the servers.json file.
function initalizeServerJsonFile() {
    fs.mkdirSync(`./data/server`, { recursive: true }, () => {});
    fs.mkdirSync(`./data/api_fetched`, { recursive: true }, () => {});
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

// remove the steam id of the server specified.
function removeRegisteredSteamIdOf(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredSteamIds = server.registeredSteamIds.filter(id => id !== steamId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
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

// check if the channel is registered at the server specified.
function isChannelRegisteredAt(serverId, channelId, channelType) {
    if (channelType === "") return false;
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds[channelType].includes(channelId) : false;
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

function getTeamNet(team) {
    let net = 0;

    for (let player of team) net += player.net_worth;
    return net;
}

function getTeamDamage(team) {
    let damage = 0;

    for (let player of team) damage += player.hero_damage;
    return damage;
}

function getRadiantTeams(matchDetails) {
    return matchDetails.data.result.players.filter(player => player.team_number === 0);
}

function getDireTeams(matchDetails) {
    return matchDetails.data.result.players.filter(player => player.team_number === 1);
}

// send the game result in discord channels.
async function sendMessageToChannels(channelId, message, messageId=null) {
    const previous = new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("Previous")
        .setStyle(ButtonStyle.Secondary);
    const next = new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(previous, next);
        
    const channel = await client.channels.fetch(channelId);
    
    if (messageId) {
        const oldMessage = await channel.messages.fetch(messageId);
        await oldMessage.delete();

        const newMessage = await channel.send({ content: message, components: [row] });
        lastIndexOnMatchHistory[newMessage.id] = lastIndexOnMatchHistory[messageId];
        delete lastIndexOnMatchHistory[messageId];
    }
    else await channel.send({ content: message, components: [row] });    
}

// send the game result of the steam id specified to the sendGameResult().
async function sendGameResult(steamId, registeredChannels, isDuplicate=true, recentMatch=null, messageId=null) {
    await Promise.all(registeredChannels.map(async (channelId) => {
        const serverId = client.channels.cache.get(channelId).guild.id;
    
        if (recentMatch === null) {
            recentMatch = await getLastMatchHistory(steamId);
            if (!isMatchHistoryPublic(recentMatch)) return;
        }
        
        const matchId = recentMatch.match_id;
    
        // check if the match has already been logged in the channel. Also to prevent unnecessary api calls.
        if (!lastMatchId[matchId]) lastMatchId[matchId] = []
        if (!isDuplicate && lastMatchId[matchId].includes(channelId)) return; // if isDuplicate is false, it will prevent from sending the same match to the same channel.
        lastMatchId[matchId] = [...lastMatchId[matchId], channelId];

        const matchDetails = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key=${process.env.STEAM_API_KEY}&match_id=${matchId}`);
        // fs.writeFileSync(`./data/api_fetched/GMD${steamId}.json`, JSON.stringify(matchDetails.data, null, 4));
    
        // temporarily sending the match duration.
        const matchDuration = matchDetails.data.result.duration;
        const playerMatchDetails = matchDetails.data.result.players.find(player => player.account_id === parseInt(getDota2IdBySteamId(steamId)));
    
        const formattedMatchDuration = (Math.floor(matchDuration / 3600)).toString().padStart(2, "0") !== "00" ? `${(Math.floor(matchDuration / 3600)).toString().padStart(2, "0")}:${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}` : `${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}`; // lol
        const formattedKDA = `${playerMatchDetails.kills}/${playerMatchDetails.deaths}/${playerMatchDetails.assists}`; // 0/0/0
        
        const radiantIsWin = matchDetails.data.result.radiant_win ? true : false;
        const playerTeamIsWin = playerMatchDetails.team_number === 0 ? radiantIsWin : !radiantIsWin;

        if (!isDuplicate) {
            if (!dayMatchHistory[serverId]) dayMatchHistory[serverId] = {};
            if (!dayMatchHistory[serverId][steamId]) dayMatchHistory[serverId][steamId] = {win: 0, lose: 0};
            if (playerTeamIsWin) dayMatchHistory[serverId][steamId].win += 1; // win
            else dayMatchHistory[serverId][steamId].lose += 1;                // lose
        }
        // if (!dayMatchHistory[serverId]) dayMatchHistory[serverId] = {};
        // if (!dayMatchHistory[serverId][steamId]) dayMatchHistory[serverId][steamId] = {win: 0, lose: 0};
        // if (playerTeamIsWin) dayMatchHistory[serverId][steamId].win += 1; // win
        // else dayMatchHistory[serverId][steamId].lose += 1;                // lose

        const matchData = {
            matchSummary: {
                gameMode: gameModes[matchDetails.data.result.game_mode],
                gameMatchDuration: formattedMatchDuration,
                gameMatchId: matchId
            },
            playerSummary: {
                playerName: await getPlayerName(steamId),
                playerKDA: formattedKDA,
                playerLevel: playerMatchDetails.level,
                playerHeroName: dota2Heroes[playerMatchDetails.hero_id],
                playerTeam: playerMatchDetails.team_number === 0 ? "Radiant" : "Dire",
                playerTeamIsWin: playerTeamIsWin,
                playerId: parseInt(getDota2IdBySteamId(steamId))
            },
            teamSummary: {
                radiant: {
                    radiantKDA: getTeamKDA(getRadiantTeams(matchDetails)),
                    ragiantNet: getTeamNet(getRadiantTeams(matchDetails)),
                    radiantDamage: getTeamDamage(getRadiantTeams(matchDetails)),
                    radiantIsWin: radiantIsWin
                },
                dire: {
                    direKDA: getTeamKDA(getDireTeams(matchDetails)),
                    direNet: getTeamNet(getDireTeams(matchDetails)),
                    direDamage: getTeamDamage(getDireTeams(matchDetails)),
                    direIsWin: !radiantIsWin
                }
            }
        }
        if (messageId) await sendMessageToChannels(channelId, JSON.stringify(matchData, null, 4), messageId);
        else await sendMessageToChannels(channelId, JSON.stringify(matchData, null, 4));
    }));
}

async function getDota2Heroes() {
    const response = await axios.get('https://api.opendota.com/api/heroes');
    const heroNames = response.data.map(hero => hero.localized_name);
    let heroObjects = {};

    for (let i = 0; i < heroNames.length; i++) heroObjects[i + 2] = heroNames[i]; // idk how but indexing of dota 2 heroes are 2 based.
    return heroObjects;
}

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

async function getPlayerName(steamId) {
    if (!fs.existsSync(`./data/api_fetched/GPS${steamId}.json`)) await isSteamIdValid(steamId); // write the GetPlayerSummaries data to the file.
    const playerData = JSON.parse(fs.readFileSync(`./data/api_fetched/GPS${steamId}.json`));
    return playerData.response.players[0].personaname;
}

/* ==================================================================================================== */
// The following code is for the Discord bot.

const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

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


    // check if the channels that are registered in server.json are still valid.
    await Promise.all(client.guilds.cache.map(async (guild) => {
        const serverId = guild.id;
        const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
        const server = servers.find(obj => obj.serverId === serverId);
        
        if (!server) return;

        let registeredChannelIds = loadAllRegisteredChannelsOf(serverId);

        // check each channels
        for (let key in registeredChannelIds) {
            registeredChannelIds[key] = registeredChannelIds[key].filter(channelId => client.channels.cache.has(channelId));
        }

        // write the updated channels to the server.json file.
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
            await Promise.all(steamIds.map(async (steamId) => { // each steam id
                await sendGameResult(steamId, registeredChannels, isDuplicate=false);
            }));
        }));
    }, 1000 * 60 * 30); // 30 minutes 

    // update dota 2 game modes every 24 hours.
    setInterval(async() => {
        gameModes = await getDota2GameModes();
    }, 1000 * 60 * 60 * 24); // 24 hours

    // update dota 2 heroes every 24 hours.
    setInterval(async() => {
        dota2Heroes = await getDota2Heroes();
    }, 1000 * 60 * 60 * 24); // 24 hours

    // auto commands for day, week, month
    setInterval(async() => {
        await Promise.all(client.guilds.cache.map(async (guild) => {
            const serverId = guild.id;
            const messageContent = await day(serverId);

            await Promise.all(loadRegisteredSteamIdsOf(serverId).map(async (steamId) => {
                if (!weekMatchHistory[serverId]) weekMatchHistory[serverId] = {};
                if (!weekMatchHistory[serverId][steamId]) weekMatchHistory[serverId][steamId] = {win: 0, lose: 0};
                if (dayMatchHistory[serverId] && dayMatchHistory[serverId][steamId]) {
                    weekMatchHistory[serverId][steamId].win += dayMatchHistory[serverId][steamId].win;
                    weekMatchHistory[serverId][steamId].lose += dayMatchHistory[serverId][steamId].lose;

                    delete dayMatchHistory[serverId][steamId];
                    if (Object.keys(dayMatchHistory[serverId]).length === 0) delete dayMatchHistory[serverId];
                }
            }));
            const registeredChannelIds = loadRegisteredChannelTypesOf(serverId, "day");
            await Promise.all(registeredChannelIds.map(async (channelId) => {
                console.log("got here")
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
                if (!monthMatchHistory[serverId]) monthMatchHistory[serverId] = {};
                if (!monthMatchHistory[serverId][steamId]) monthMatchHistory[serverId][steamId] = {win: 0, lose: 0};
                if (weekMatchHistory[serverId] && weekMatchHistory[serverId][steamId]) {
                    monthMatchHistory[serverId][steamId].win += weekMatchHistory[serverId][steamId].win;
                    monthMatchHistory[serverId][steamId].lose += weekMatchHistory[serverId][steamId].lose;

                    delete weekMatchHistory[serverId][steamId];
                    if (Object.keys(weekMatchHistory[serverId]).length === 0) delete weekMatchHistory[serverId];
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
                    if (monthMatchHistory[serverId] && monthMatchHistory[serverId][steamId]) {
                        delete monthMatchHistory[serverId][steamId];
                        if (Object.keys(monthMatchHistory[serverId]).length === 0) delete monthMatchHistory[serverId];
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

client.on("channelDelete", async (channel) => {
    const serverId = channel.guild.id;
    const channelId = channel.id;
    const channelType = loadChannelTypeOf(serverId, channelId);
    removeRegisteredChannelOf(serverId, channelId, channelType);
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
            if (!await isSteamIdValid(steamId)) {
                interaction.editReply("Error: Invalid Steam ID.");
                return;
            }
            if (isSteamIdRegistered(steamId)) { // check all servers
                const steamIdRegisteredLocations = loadWhereSteamIdRegistered(steamId);
                interaction.editReply(`Notice: Steam ID already registered in the following servers: ${steamIdRegisteredLocations.join(", ")}`);
            }
            if (isSteamIdRegisteredAt(interaction.guild.id, steamId)) { // check only in the server
                interaction.followUp("Error: Steam ID already registered in this server.");
                return;
            }

            registerSteamId(steamId, serverId);
            interaction.followUp("Steam ID registered successfully.");
        }
        else if (subCommand === "remove") {
            await interaction.deferReply();
            let steamId = options.getString("id");
            const serverId = interaction.guild.id;

            if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId); // conver the dota 2 id to steam id.
            if (!await isSteamIdValid(steamId)) {
                interaction.editReply("Error: Invalid Steam ID.");
                return;
            }
            if (!isSteamIdRegisteredAt(interaction.guild.id, steamId)) {
                interaction.editReply("Error: Steam ID not registered on this server.");
                return;
            }

            removeRegisteredSteamIdOf(serverId, steamId);
            interaction.editReply("Steam ID unregistered successfully.");
        }
        else if (subCommand === "list") {
            await interaction.deferReply();
            const serverId = interaction.guild.id;
            const registeredSteamIds = loadRegisteredSteamIdsOf(serverId);
            
            if (registeredSteamIds.length === 0) {
                interaction.editReply("Error: No Steam IDs are registered on this server.");
                return;
            }
            
            let message = "";
            for (let steamId of registeredSteamIds) {
                const isHistoryPublic = isMatchHistoryPublic(await getLastMatchHistory(steamId));
                message += `${steamId} state: ${isHistoryPublic ? "Public" : "Private"}\n`;
            }
            interaction.editReply(message);
        }
    }
    else if (commandName === "channels") {
        await interaction.deferReply();
        const serverId = interaction.guild.id;
    
        if (loadAllRegisteredChannelsOf(serverId).length === 0) {
            interaction.editReply("Error: No channels registered on this server.");
            return;
        }

        const registeredChannelIds = loadAllRegisteredChannelsOf(serverId);
        const allChannels = registeredChannelIds["all"].map(id => client.channels.cache.get(id).name);
        const matchChannels = registeredChannelIds["match"].map(id => client.channels.cache.get(id).name);
        const dayChannels = registeredChannelIds["day"].map(id => client.channels.cache.get(id).name);
        const weekChannels = registeredChannelIds["week"].map(id => client.channels.cache.get(id).name);
        const monthChannels = registeredChannelIds["month"].map(id => client.channels.cache.get(id).name);
        const channelNames = `Registered Channels:\n All: ${allChannels.join(", ")}\n Match: ${matchChannels.join(", ")}\n Day: ${dayChannels.join(", ")}\n Week: ${weekChannels.join(", ")}\n Month: ${monthChannels.join(", ")}`;
        interaction.editReply(channelNames);
    }
    else if (commandName === "setchannel") {
        await interaction.deferReply();

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("Error: You must be an admin to set a channel.");
            return;
        }

        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;
        const channelType = options.getString("type");

        if (isChannelRegisteredAt(serverId, channelId, channelType)) {
            interaction.editReply("Error: Channel already registered.");
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

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("Error: You must be an admin to unset a channel.");
            return;
        }
        if (!isChannelRegisteredAt(serverId, channelId, channelType)) {
            interaction.editReply("Error: Channel is not registered.");
            return;
        }

        removeRegisteredChannelOf(serverId, channelId, channelType);
        interaction.editReply("Channel unregistered successfully.");
    }
    // temporary help command, will be updated later.
    else if (commandName === "help") {
        await interaction.deferReply();
        interaction.editReply("```Slash Commands:\n/register add <id>\n/register remove <id>\n/register list\n/channels\n/setchannel\n/unsetchannel\n/help```");
    }
    else if (commandName === "all") {
        // what does this do?
    }
    else if (commandName === "match") {
        const serverId = interaction.guild.id;
        let steamId = options.getString("id");
        if (steamId.length !== 17) steamId = getSteamIdByDota2Id(steamId);
        
        const channelId = interaction.channel.id;

        if (!isSteamIdRegisteredAt(serverId, steamId)) {
            interaction.reply("Error: Steam ID not registered on this server.");
            return;
        }

        await sendGameResult(steamId, [channelId], isDuplicate=true);
    }
    // the rest are auto commands.
    else if (commandName === "day") {
        const serverId = interaction.guild.id;
        const output = await day(serverId);
        interaction.reply(output);
    }
    else if (commandName === "week") {
        const serverId = interaction.guild.id;
        const output = await week(serverId);
        interaction.reply(output);
    }
    else if (commandName === "month") {
        const serverId = interaction.guild.id;
        const output = await month(serverId);
        interaction.reply(output);
    }
    else if (commandName === "dota2id") {
        const steamId = options.getString("id");
        if (steamId.length !== 17) {
            interaction.reply("Error: Invalid Steam ID length. (must be 17 digits)");
            return;
        }
        interaction.reply(getDota2IdBySteamId(steamId));
    }
    else if (commandName === "steamid") {
        const dota2Id = options.getString("id");
        interaction.reply(getSteamIdByDota2Id(dota2Id));
    }
    else if (commandName === "verifyid") {
        const steamId = options.getString("id");
        if (steamId.length !== 17) {
            interaction.reply("Error: Invalid Steam ID length. (must be 17 digits)");
            return;
        }
        if (await isSteamIdValid(steamId)) interaction.reply("Steam ID is valid.");
        else interaction.reply("Steam ID is invalid.");
    }
    else if (interaction.isButton()) {
        // imagine this as undo and redo buttons.
        // this button will browse to the older match history of the player.
        if (interaction.customId === "previous") {
            const messageContent = JSON.parse(interaction.message.content);
            const steamId = getSteamIdByDota2Id(messageContent.playerSummary.playerId.toString());
            const messageId = interaction.message.id;
            let currentIndex = lastIndexOnMatchHistory[messageId] || 0;

            if (currentIndex === 100) {
                interaction.reply("Error: No more match history to show.");
                return;
            }

            currentIndex += 1;
            lastIndexOnMatchHistory[messageId] = currentIndex;
            const previousMatch = await getMatchHistoryIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, previousMatch, messageId);
        }
        // this button will browse to the newer match history of the player.
        else if (interaction.customId === "next") {
            const messageContent = JSON.parse(interaction.message.content);
            const steamId = getSteamIdByDota2Id(messageContent.playerSummary.playerId.toString());
            const messageId = interaction.message.id;
            let currentIndex = lastIndexOnMatchHistory[messageId] || 0;
            
            if (currentIndex === 0) {
                interaction.reply("Error: No more match history to show.");
                return;
            }

            currentIndex -= 1;
            lastIndexOnMatchHistory[messageId] = currentIndex;
            const nextMatch = await getMatchHistoryIndex(currentIndex, steamId);
            await sendGameResult(steamId, [interaction.channel.id], isDuplicate=true, nextMatch, messageId);
        }
    }
});

client.login(process.env.TOKEN);

// doesnt account for when a channel is deleted, it will crash.
    // YES: check the channels if exists initially.
    // YES: also check in runtime periodically.
// YES: channels can be registered in multiple channel types (do?)
// YES: loadAllRegisteredChannelsOf() (return in object form?)