const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

let lastMatchIdArray = [];
let gameModes = {
    0: "Unknown",
    1: "All Pick",
    2: "Captains Mode",
    3: "Random Draft",
    4: "Single Draft",
    5: "All Random",
    6: "Intro",
    7: "Diretide",
    8: "Reverse Captains Mode",
    9: "Greeviling",
    10: "Tutorial",
    11: "Mid Only",
    12: "Least Played",
    13: "New Player Pool",
    14: "Compendium Matchmaking",
    15: "Custom",
    16: "Captains Draft",
    17: "Balanced Draft",
    18: "Ability Draft",
    19: "Event",
    20: "All Random Death Match",
    21: "1v1 Mid",
    22: "All Draft"
};

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
function loadRegisteredChannelsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds : [];
}

// initialize the servers.json file.
function initalizeServerJsonFile() {
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: []}, null, 4));
}

// register the steam id and also channels that are registered in the server specified. (if there are any)
function registerSteamId(steamId, serverId, registeredChannels) {
    let servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    // if the server object doesnt exist, initialize a new one.
    if (!server) {
        servers.push({
            serverId: serverId,
            registeredSteamIds: [steamId],
            registeredChannelIds: registeredChannels
        });
    }
    // if it exists, just push the steam id and the registered channels. (it doesnt include duplicates)
    else {
        server.registeredSteamIds.push(steamId);
        if (registeredChannels.length > 0) {
            for (let channelId of registeredChannels) {
                if (!server.registeredChannelIds.includes(channelId)) {
                    server.registeredChannelIds.push(channelId);
                }
            }
        }
    }
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the steam id of the server specified.
function removeRegisteredStreamIdOf(serverId, steamId) {
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

// check if the channel is registered at the server specified.
function isChannelRegisteredAt(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds.includes(channelId) : false;
}

// register the channel id at the server specified.
function registerChannel(channelId, serverId) {
    let servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    if (!server) {
        servers.push({
            serverId: serverId,
            registeredSteamIds: [],
            registeredChannelIds: [channelId]
        });
    }
    else {
        // dont need to check if theres a duplicate, as its checked beforehand.
        server.registeredChannelIds.push(channelId);
    }

    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// remove the registered channel of the server specified.
function removeRegisteredChannelOf(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredChannelIds = server.registeredChannelIds.filter(id => id !== channelId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

// send the game result in discord channels.
async function sendMessageToChannels(registeredChannels, gameData) {
    await Promise.all(registeredChannels.map(async (channelId) => { // each channel
        const channel = await client.channels.fetch(channelId);
        await channel.send(gameData);
    }));
}

// send the game result of the steam id specified to the sendGameResult().
async function sendGameResult(steamId, registeredChannels) {
    const recentMatch = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchHistory/V001/?key=${process.env.STEAM_API_KEY}&account_id=${steamId}&matches_requested=1`);
    if (recentMatch.data.result.status === 15) return; // match history is private.
    fs.writeFileSync(`./data/api_fetched/GMH${steamId}.json`, JSON.stringify(recentMatch.data, null, 4));
    const matchId = recentMatch.data.result.matches[0].match_id;

    // check if the match id is the same on the last one. this means that the match has already been logged.
    // to prevent unnecessary api calls.
    if (lastMatchIdArray.includes(matchId)) return;
    lastMatchIdArray.push(matchId);

    const matchDetails = await axios.get(`http://api.steampowered.com/IDOTA2Match_570/GetMatchDetails/V001/?key=${process.env.STEAM_API_KEY}&match_id=${matchId}`);
    fs.writeFileSync(`./data/api_fetched/GMD${steamId}.json`, JSON.stringify(matchDetails.data, null, 4));

    // temporarily sending the match duration.
    const matchDuration = matchDetails.data.result.duration;
    const formattedMatchDuration =  (Math.floor(matchDuration / 3600)).toString().padStart(2, "0") !== "00" ? `${(Math.floor(matchDuration / 3600)).toString().padStart(2, "0")}:${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}` : `${(Math.floor((matchDuration % 3600) / 60)).toString().padStart(2, "0")}:${(matchDuration % 60).toString().padStart(2, "0")}`;
    sendMessageToChannels(registeredChannels, `Player: ${getPlayerName(steamId)}\nMatch ID: ${matchId}\nMatch Duration: ${formattedMatchDuration}`);
}

// this is essentially getting the steamId3 from the steamId - the steam64Base constant, I think dota 2 id uses steamId3. This needs a string argument.
function getDota2IdBySteamId(steamId) {
    const steam64Base = BigInt("76561197960265728");
    return (BigInt(steamId) - steam64Base).toString();
}

// convert the dota 2 id to steam id. (steamId3 to steamId)
function getStreamIdByDota2Id(dota2Id) {
    const steam64Base = BigInt("76561197960265728");
    return (BigInt(dota2Id) + steam64Base).toString();
}

function getPlayerName(steamId) {
    const response = JSON.parse(fs.readFileSync(`./data/api_fetched/GPS${steamId}.json`));
    return response.response.players[0].personaname;
}

/* ==================================================================================================== */
// The following code is for the Discord bot.

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", () => {
    console.log(`${client.user.tag} is online.`);
    if (!fs.existsSync(`./data/server/servers.json`)) {
        initalizeServerJsonFile();
    }

    // this fetches all the registered steam ids of all the servers.
    // in this setInterval(), it will log the game results of each steam id.
    // interval is set to 30 minutes. (average game duration of dota 2 matches)
    setInterval(async() => {
        await Promise.all(client.guilds.cache.map(async (guild) => { // each server
            const steamIds = loadRegisteredSteamIdsOf(guild.id);
            if(steamIds.length === 0) return;
            const registeredChannels = loadRegisteredChannelsOf(guild.id);
            if (registeredChannels.length === 0) return;

            await Promise.all(steamIds.map(async (steamId) => { // each steam id
                await sendGameResult(steamId, registeredChannels);
            }));
        }));
    }, 60000 * 30);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName, options } = interaction;

    // your register a user here, either its your account or someone else, its valid.
    // so does your account id also. In this part when you /register add, it adds the id
    // on the server where you are currenyly on.
    if (commandName === "register") {
        const subCommand = options.getSubcommand();
        if (subCommand === "add") {
            await interaction.deferReply({ ephemeral: true });
            let steamId = options.getString("id");
            const serverId = interaction.guild.id;
            
            if (steamId.length !== 17) { // conver the dota 2 id to steam id.
                steamId = getStreamIdByDota2Id(steamId);
            }
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

            const registeredChannels = loadRegisteredChannelsOf(interaction.guild.id);
            registerSteamId(steamId, serverId, registeredChannels);
            interaction.followUp("Steam ID registered successfully.");
        }
        else if (subCommand === "remove") {
            await interaction.deferReply({ ephemeral: true });
            let steamId = options.getString("id");
            const serverId = interaction.guild.id;

            if (steamId.length !== 17) { // conver the dota 2 id to steam id.
                steamId = getStreamIdByDota2Id(steamId);
            }
            if (!await isSteamIdValid(steamId)) {
                interaction.editReply("Error: Invalid Steam ID.");
                return;
            }
            if (!isSteamIdRegisteredAt(interaction.guild.id, steamId)) {
                interaction.editReply("Error: Steam ID not registered on this server.");
                return;
            }

            removeRegisteredStreamIdOf(serverId, steamId);
            interaction.editReply("Steam ID unregistered successfully.");
        }
        else if (subCommand === "list") {
            await interaction.deferReply({ ephemeral: true });
            const serverId = interaction.guild.id;
            const registeredSteamIds = loadRegisteredSteamIdsOf(serverId);
            
            if (registeredSteamIds.length === 0) {
                interaction.editReply("Error: No Steam IDs are registered on this server.");
                return;
            }
            
            interaction.editReply(`Registered Steam IDs: ${registeredSteamIds.join(", ")}`);
        }
    }
    else if (commandName === "channels") {
        await interaction.deferReply({ ephemeral: true });
        const serverId = interaction.guild.id;
        const registeredChannels = loadRegisteredChannelsOf(serverId);
        
        if (registeredChannels.length === 0) {
            interaction.editReply("Error: No channels are registered on this server.");
            return;
        }

        interaction.editReply(`Registered Channels: ${registeredChannels.join(", ")}`);
    }
    else if (commandName === "setchannel") {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("Error: You must be an admin to set a channel.");
            return;
        }
        if (isChannelRegisteredAt(serverId, channelId)) {
            interaction.editReply("Error: Channel already registered.");
            return;
        }

        registerChannel(channelId, serverId);
        interaction.editReply("Channel registered successfully.");
    }
    else if (commandName === "unsetchannel") {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("Error: You must be an admin to unset a channel.");
            return;
        }
        if (!isChannelRegisteredAt(serverId, channelId)) {
            interaction.editReply("Error: Channel is not registered.");
            return;
        }

        removeRegisteredChannelOf(serverId, channelId);
        interaction.editReply("Channel unregistered successfully.");
    }
    // temporary help command, will be updated later.
    else if (commandName === "help") {
        await interaction.deferReply({ ephemeral: true });
        interaction.editReply("```Slash Commands:\n/register add <id>\n/register remove <id>\n/register list\n/channels\n/setchannel\n/unsetchannel\n/help```");
    }
});

client.login(process.env.TOKEN);

// get set channel ids on the server via ping
// list all registered channel of that server
// convert the channel ids to channel names