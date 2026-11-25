import * as Discord from "discord.js";

import "./util/terminate";
import "./util/formatTime";

import { createCommands } from "./commands";
import { retrieveToken } from "./util/token";

import settings from "./settings";

const client = new Discord.Client({
    intents: [
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.GuildModeration,
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.MessageContent,
    ]
});

const token = retrieveToken();

createCommands(client, settings);

client.login(token);
console.log("Started");
