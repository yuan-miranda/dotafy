require("dotenv").config();
/* ==================================================================================================== */
// The following code is for the Discord bot.

const { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once("ready", async () => {
    console.log(`${client.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content === "q") {
        const button = new ButtonBuilder()
            .setCustomId("a")
            .setLabel("A")
            .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder()
            .addComponents(button);

        const attachment = new AttachmentBuilder()
            .setFile("./output.png")
            .setName("output.png");

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("All Draft 1:20:32")
            .setAuthor({ name: "yuanee", iconURL: "https://avatars.steamstatic.com/6cdd0d17b6cbaaed8d55dcf597f1ff06f10339a9_full.jpg", url: "https://steamcommunity.com/profiles/76561199401129478/"})
            .setThumbnail("http://cdn.dota2.com/apps/dota2/images/heroes/lina_full.png")
            .addFields(
                { name: "kda", value: "10/0/10", inline: true },
                { name: "level", value: "25", inline: true },
                { name: "hero", value: "Lina", inline: true },
                { name: "team", value: "Radiant", inline: true },
            )
            .setImage("attachment://output.png");
        message.channel.send({ embeds: [embed], components: [row], files: [attachment] });
    }
})

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "a") {
        const messageContent = interaction.message.embeds[0].fields;
        console.log(messageContent);
        interaction.update(messageContent);
    }
});

client.login(process.env.TOKEN);