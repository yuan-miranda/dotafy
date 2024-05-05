const axios = require('axios');
require("dotenv").config();

async function getPlayerSummary(steamId) {
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`);
    return response.data.response.players[0];
}

getPlayerSummary("76561199401129478").then(data => {
    console.log(data);
}).catch(err => {
    console.error(err);
});