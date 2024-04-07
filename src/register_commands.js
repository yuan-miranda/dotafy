const { REST, Routes, ApplicationCommandOptionType } = require("discord.js");
require("dotenv").config();

const commands = [
    {
        name: 'help',
        description: 'Get help with the bot.',
        options: []
    },
    {
        name: 'channel',
        description: 'List all channels that the bot is logging messages in.',
        options: []
    },
    {
        name: 'setchannel',
        description: 'Set the channel for logging messages. Must be on the channel you want to set. (Admin only)',
        options: []
    },
    {
        name: 'unsetchannel',
        description: 'Unset the channel for logging messages. Must be on the channel you want to unset. (Admin only)',
        options: []
    },
    {
        name: 'list',
        description: 'List all channels that the bot is logging messages in.',
        options: []
    },
    {
        name: 'register',
        description: 'Register a user',
        options: [
            {
                name: 'add',
                description: 'Add a user',
                type: 1,
                options: [
                    {
                        name: 'steam_id',
                        description: 'Steam account ID',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'remove',
                description: 'Remove a user',
                type: 1,
                options: [
                    {
                        name: 'steam_id',
                        description: 'Steam account ID',
                        type: 3,
                        required: true
                    }
                ]
            },
            {
                name: 'list',
                description: 'List all registered users',
                type: 1,
                options: []
            }
        ]
    },
    
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