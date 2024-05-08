const fs = require('fs');

let dailyStanding = {
    previousStanding: {},
    currentStanding: {
        s1: {
            u1: {win: 10, lose: 5},
            u2: {win: 7, lose: 2},
            u3: {win: 15, lose: 10},
            u4: {win: 20, lose: 15},
            u5: {win: 25, lose: 20}
        }
    }
}

function checkStandingChanges(previousStanding, currentStanding, serverId) {

}

function formatStanding(currentStanding, serverId) {
    let users = currentStanding[serverId];
    let keys = Object.keys(users);

    // sort the user based on their win/lose ratio
    keys.sort((a, b) => {
        const aRatio = users[a].win / (users[a].lose || 1);
        const bRatio = users[b].win / (users[b].lose || 1);
        return bRatio - aRatio;
    });

    // convert the sorted array back to an object
    users = keys.reduce((obj, user) => {
        obj[user] = users[user];
        return obj;
    }, {});

    currentStanding[serverId] = users;
    return currentStanding;
}

console.log(JSON.stringify(dailyStanding.currentStanding, null, 2));
formatStanding(dailyStanding.currentStanding, "s1");
console.log(JSON.stringify(dailyStanding.currentStanding, null, 2));