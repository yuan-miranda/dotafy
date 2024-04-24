function getDota2IdBySteamId(steamId) {
    const steam64Base = BigInt("76561197960265728");
    return (BigInt(steamId) - steam64Base).toString();
}

console.log(getDota2IdBySteamId("76561199401129478"));
console.log(getDota2IdBySteamId("76561198103151062"));