const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");
require("dotenv").config();

const commands = [
    {
        name: 'help',
        description: 'Get help on how to use the bot.',
        options: []
    },
    {
        name: 'channels',
        description: 'List all the channels that are registered for logging messages.',
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
                        name: 'All bot messages',
                        value: 'all'
                    },
                    {
                        name: 'Match results channel',
                        value: 'match'
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
                    }
                ]
            }
        ]
    },
    {
        name: 'unsetchannel',
        description: 'Unset the channel for logging messages. Must be on the channel you want to unset. (admin only)',
        options: []
    },
    {
        name: 'register',
        description: 'Register a user',
        options: [
            {
                name: 'add',
                description: 'Add a dota account.',
                type: 1,
                options: [
                    {
                        name: 'id',
                        description: 'Steam or Dota 2 ID. If you provide the Dota 2 ID it will be converted to Steam ID.',
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
                        description: 'Steam or Dota 2 ID to remove. If you provide the Dota 2 ID it will be converted to Steam ID.',
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
                                description: 'List all the users.',
                                value: 'all'
                            },
                            {
                                name: 'public',
                                description: 'List all the users who have their match history public.',
                                value: 'public'
                            },
                            {
                                name: 'private',
                                description: 'List all the users who have their match history private.',
                                value: 'private'
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        name: 'all',
        description: 'Get the matches played today.',
        options: []
    },
    {
        name: 'match',
        description: 'Get the matches played by the player.',
        options: [
            {
                name: 'id',
                description: 'Steam ID of the player.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'day',
        description: 'Get the matches played today.',
        options: []
    },
    {
        name: 'week',
        description: 'Get the matches played this week.',
        options: []
    },
    {
        name: 'month',
        description: 'Get the matches played this month.',
        options: []
    },
    {
        name: 'dota2id',
        description: 'Convert Steam ID to Dota 2 ID.',
        options: [
            {
                name: 'id',
                description: 'Steam ID of the player.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'steamid',
        description: 'Convert Dota 2 ID to Steam ID.',
        options: [
            {
                name: 'id',
                description: 'Dota 2 ID of the player.',
                type: 3,
                required: true
            }
        ]
    },
    {
        name: 'verifyid',
        description: 'Verify the Steam ID of the player.',
        options: [
            {
                name: 'id',
                description: 'Steam ID of the player.',
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