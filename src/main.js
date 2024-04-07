const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

async function isSteamIdValid(steam_id){
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steam_id}`);
    return response.data.response.players.length > 0;
}
function isSteamIdRegisteredAt(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds.includes(steamId) : false;
}
function isSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    return servers.some(obj => obj.registeredSteamIds.includes(steamId));
}
function loadWhereSteamIdRegistered(steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const filteredServers = servers.filter(obj => obj.registeredSteamIds.includes(steamId));
    return filteredServers.map(obj => obj.serverId);
}
function loadRegisteredChannelsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds : [];
}

function initalizeServerJsonFile() {
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: []}, null, 4));
}

function registerSteamId(steamId, serverId, registeredChannels) {
    let servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    let server = servers.find(obj => obj.serverId === serverId);

    if (!server) {
        servers.push({
            serverId: serverId,
            registeredSteamIds: [steamId],
            registeredChannelIds: registeredChannels
        });
    }
    else {
        server.registeredSteamIds.push(steamId);
        // server.registeredChannelIds.push(...registeredChannels);
        if (registeredChannels.length === 0) {
            return;
        }
        for (let channelId of registeredChannels) {
            if (!server.registeredChannelIds.includes(channelId)) {
                server.registeredChannelIds.push(channelId);
            }
        }
    }

    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}
function removeRegisteredStreamIdOf(serverId, steamId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredSteamIds = server.registeredSteamIds.filter(id => id !== steamId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}
function loadRegisteredSteamIdsOf(serverId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredSteamIds : [];
}
function isChannelRegisteredAt(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    return server ? server.registeredChannelIds.includes(channelId) : false;
}
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
function removeRegisteredChannelOf(serverId, channelId) {
    const servers = JSON.parse(fs.readFileSync(`./data/server/servers.json`)).servers;
    const server = servers.find(obj => obj.serverId === serverId);
    server.registeredChannelIds = server.registeredChannelIds.filter(id => id !== channelId);
    fs.writeFileSync(`./data/server/servers.json`, JSON.stringify({servers: servers}, null, 4));
}

const { Client, GatewayIntentBits } = require('discord.js');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`${client.user.tag} is online.`);
    if (!fs.existsSync(`./data/server/servers.json`)) {
        initalizeServerJsonFile();
    }

    // setTimeout(async () => {
    // }, 60000);
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
            const steamId = options.getString("steam_id");
            const serverId = interaction.guild.id;

            if (!await isSteamIdValid(steamId)) {
                interaction.editReply("Invalid Steam ID.");
                return;
            }
            if (isSteamIdRegistered(steamId)) { // check all servers
                const steamIdRegisteredLocations = loadWhereSteamIdRegistered(steamId);
                interaction.editReply(`Notice: Steam ID registered in ${steamIdRegisteredLocations.join(", ")}.`);
            }
            if (isSteamIdRegisteredAt(interaction.guild.id, steamId)) { // check only in the server
                interaction.followUp("Steam ID already registered in this server.");
                return;
            }

            const registeredChannels = loadRegisteredChannelsOf(interaction.guild.id);
            registerSteamId(steamId, serverId, registeredChannels);
            interaction.followUp("Steam ID successfully registered.");
        }
        else if (subCommand === "remove") {
            await interaction.deferReply({ ephemeral: true });
            const steamId = options.getString("steam_id");
            const serverId = interaction.guild.id;
            if (!await isSteamIdValid(steamId)) {
                interaction.editReply("Invalid Steam ID.");
                return;
            }
            if (!isSteamIdRegisteredAt(interaction.guild.id, steamId)) {
                interaction.editReply("Steam ID not registered in this server.");
                return;
            }

            removeRegisteredStreamIdOf(serverId, steamId);
            interaction.editReply("Steam ID removed on this server.");
        }
        else if (subCommand === "list") {
            await interaction.deferReply({ ephemeral: true });
            const serverId = interaction.guild.id;
            const registeredSteamIds = loadRegisteredSteamIdsOf(serverId);
            
            if (registeredSteamIds.length === 0) {
                interaction.editReply("No registered Steam IDs.");
                return;
            }
            
            interaction.editReply(`Registered Steam IDs: ${registeredSteamIds.join(", ")}`);
        }
    }
    else if (commandName === "channel") {
        await interaction.deferReply({ ephemeral: true });
        const serverId = interaction.guild.id;
        const registeredChannels = loadRegisteredChannelsOf(serverId);
        
        if (registeredChannels.length === 0) {
            interaction.editReply("No registered channels.");
            return;
        }

        interaction.editReply(`Registered channels: ${registeredChannels.join(", ")}`);
    }
    else if (commandName === "setchannel") {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("You must be an admin to set the channel.");
            return;
        }

        if (isChannelRegisteredAt(serverId, channelId)) {
            interaction.editReply("Channel already registered.");
            return;
        }

        registerChannel(channelId, serverId);
        interaction.editReply("Channel registered.");
    }
    else if (commandName === "unsetchannel") {
        await interaction.deferReply({ ephemeral: true });
        const channelId = interaction.channel.id;
        const serverId = interaction.guild.id;

        if (!interaction.member.permissions.has("1221426032817733662")) {
            interaction.editReply("You must be an admin to unset the channel.");
            return;
        }
        if (!isChannelRegisteredAt(serverId, channelId)) {
            interaction.editReply("Channel not registered.");
            return;
        }

        removeRegisteredChannelOf(serverId, channelId);
        interaction.editReply("Channel unregistered.");
    }
    else if (commandName === "help") {
        await interaction.deferReply({ ephemeral: true });
        interaction.editReply("Commands: /register, /channel, /setchannel, /unsetchannel, /help");
    }
});

client.login(process.env.TOKEN);


// get set channel ids on the server via ping
// list all registered channel of that server
// convert the channel ids to channel names