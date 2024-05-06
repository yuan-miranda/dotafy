const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

// return the list of dota 2 heroes.
async function getDota2Heroes() {
    const response = await axios.get('https://api.opendota.com/api/heroes');
    let heroObjects = {};
    for (let hero of response.data) {
        heroObjects[hero.id] = [
            hero.localized_name,
            hero.name.replace("npc_dota_hero_", "")
        ];
    }
    return heroObjects;
}

async function fetchHeroes() {
    const heroes = await getDota2Heroes();
    const matchResponse = await axios.get(`https://api.opendota.com/api/matches/7711712122`);

    fs.writeFileSync("./heroes.json", JSON.stringify(heroes, null, 4));

    // log each heroes name in the match
    for (let player of matchResponse.data.players) {
        console.log(heroes[player.hero_id][0]);
    }
    
    // fs.writeFileSync("./match.json", JSON.stringify(matchResponse.data, null, 4));
    // console.log(response.data);
    // console.log(matchResponse.data);
}

fetchHeroes().then(() => console.log("done"));