const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");
require("dotenv").config({ path: `${__dirname}/.env` });

const commands = [
    {
        name: 'help',
        description: 'Sends a help message on how to use the bot.',
        options: []
    },
    {
        name: 'channels',
        description: 'List all the channels in this server.',
        options: []
    },
    {
        name: 'setchannel',
        description: 'Set the channel for logging messages. Must be on the channel you want to set. (admin only)',
        type: 1,
        options: [
            {
                name: 'type',
                description: 'Type of the channel to set as.',
                type: 3,
                required: true,
                choices: [
                    {
                        name: 'Match results',
                        value: 'match'
                    },
                    {
                        name: 'auto /streaks',
                        value: 'streaks'
                    },
                    {
                        name: 'auto /dailystats',
                        value: 'stats'
                    },
                    {
                        name: 'auto /day',
                        value: 'day'
                    },
                    {
                        name: 'auto /week',
                        value: 'week'
                    },
                    {
                        name: 'auto /month',
                        value: 'month'
                    },
                    {
                        name: 'auto /year',
                        value: 'year'
                    }
                ]
            }
        ]
    },
    {
        name: 'unsetchannel',
        description: 'Remove the channel for logging messages. Must be on the channel you want to remove. (admin only)',
        options: []
    },
    {
        name: 'register',
        description: 'Add, remove or list dota accounts.',
        options: [
            {
                name: 'add',
                description: 'Add a dota account.',
                type: 1,
                options: [
                    {
                        name: 'id',
                        description: 'Steam Id or Dota 2 Id.',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'remove',
                description: 'Remove a dota account.',
                type: 1,
                options: [
                    {
                        name: 'id',
                        description: 'Steam Id or Dota 2 Id.',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'list',
                description: 'List all the dota accounts registered.',
                type: 1,
                options: [
                    {
                        name: 'type',
                        description: 'type of user to list. (default: all)',
                        type: 3,
                        choices: [
                            {
                                name: 'all',
                                description: 'List all users. (default)',
                                value: 'all'
                            },
                            {
                                name: 'public',
                                description: 'List all the users that has public match history.',
                                value: 'public'
                            },
                            {
                                name: 'private',
                                description: 'List all the users that has private match history.',
                                value: 'private'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        name: 'leaderboards',
        description: 'Get the leaderboards of the server.',
        options: []
    },
    {
        name: 'dailystats',
        description: 'Get the daily stats of the server.',
        options: []
    },
    {
        name: 'streaks',
        description: 'Get the list of win and lose streaks of players on the server.',
        options: [
            {
                name: 'type',
                description: 'Type of streak to get.',
                type: 3,
                required: false,
                choices: [
                    {
                        name: 'All streaks',
                        value: 'all'
                    },
                    {
                        name: 'Win streaks',
                        value: 'win'
                    },
                    {
                        name: 'Lose streaks',
                        value: 'lose'
                    }
                ]
            }
        ]
    },
    {
        name: 'match',
        description: 'Get the most recent match of the user.',
        options: [
            {
                name: 'id',
                description: 'Steam Id or Dota 2 Id.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'day',
        description: 'Get the daily standings on the server.',
        options: []
    },
    {
        name: 'week',
        description: 'Get the weekly standings on the server.',
        options: []
    },
    {
        name: 'month',
        description: 'Get the monthly standings on the server.',
        options: []
    },
    {
        name: 'year',
        description: 'Get the yearly standings on the server.',
        options: []
    },
    {
        name: 'dota2id',
        description: 'Convert the valid steam id to its dota 2 id.',
        options: [
            {
                name: 'id',
                description: 'Steam Id.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'steamid',
        description: 'Convert the dota 2 id to its steam id. (It only convert but doesnt verify it)',
        options: [
            {
                name: 'id',
                description: 'Dota 2 Id.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'verifyid',
        description: 'Check if the steam id is valid.',
        options: [
            {
                name: 'id',
                description: 'Steam Id.',
                type: 3,
                required: true
            }
        ]
    }
]

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
      
        await rest.put(Routes.applicationCommands(process.env.BOT_ID), { body: commands });
      
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();