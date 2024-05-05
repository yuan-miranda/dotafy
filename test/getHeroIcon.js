const axios = require('axios');

async function getHeroIcons() {
    const response = await axios.get(`https://api.opendota.com/api/heroes`);
    const heroes = response.data;
    console.log(heroes.localized_name);
    const heroIcons = heroes.map(hero => {
        const heroName = hero.name.replace('npc_dota_hero_', '');
        const iconUrl = `http://cdn.dota2.com/apps/dota2/images/heroes/${heroName}_full.png`;
        return iconUrl;
    });
    return heroIcons;
}

getHeroIcons().then(icons => {
    // console.log(icons);
}).catch(err => {
    console.error(err);
});