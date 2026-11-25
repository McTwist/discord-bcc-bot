
import * as Discord from "discord.js";

import CommandArguments, { MessageChannel } from "./command/arguments";
import getSomeInfo from "./getinfo";
import { createServers } from "./command/servers";
import { createHello, getHello } from "./command/hello";
import { createInfo } from "./command/info";
import { createVc, createVcCleanup, createVcid } from "./command/voicechat";
import { createRole } from "./command/role";
import { createStaffwatch } from "./command/staffwatch";
import Logging from "./logging";
import { Settings } from "./settings";


function createFunctions() {
	interface CommandFunction {
		func: (args: CommandArguments) => void;
		channel?: string;
	};
	const functions: Record<string, CommandFunction> = {};
	const aliases: Record<string, string> = {};

	function add(func: CommandFunction['func'], cmd: string, ...alias: string[]) {
		for (const c of [cmd, ...alias]) {
			functions[c] = { func };
		}
		for (const c of alias) {
			aliases[c] = cmd;
		}
	}

	function addChannel(func: CommandFunction['func'], channel: string, cmd: string, ...alias: string[]) {
		for (const c of [cmd, ...alias]) {
			functions[c] = { func, channel };
		}
		for (const c of alias) {
			aliases[c] = cmd;
		}
	}

	function call(cmd: string, args: CommandArguments) {
		if (!(cmd in functions)) {
			return;
		}
		if (functions[cmd].channel !== undefined &&
				args.channel.id !== functions[cmd].channel) {
			return;
		}
		functions[cmd].func(args);
	}

	function getFunctions() {
        const cmdlineFuncs = [];
        for (let cmd in functions) {
            if (cmd in aliases) {
                cmdlineFuncs.push(`\`!${cmd}\` *(alias of \`!${aliases[cmd]}\`)*`);
            } else {
                cmdlineFuncs.push(`\`!${cmd}\``);
            }
        }
		return cmdlineFuncs;
	}

	return {
		add,
		addChannel,
		call,
		getFunctions
	};
}

export function createCommands(client: Discord.Client, settings: Settings) {
	const functions = createFunctions();
	functions.add(createHello(), "hello");
	functions.addChannel(createServers(), settings.channels.commands, "servers");
	functions.addChannel(createInfo(functions.getFunctions, settings.debug), settings.channels.commands, "info", "help", "cmds");
	functions.addChannel(createRole(settings.toggleableRoles), settings.channels.commands, "role");
	functions.add(createVc(client, settings.channels.commands, settings.voiceCategory), "vc");
	functions.addChannel(createVcid(), settings.channels.commands, "vcid");
	functions.add(createStaffwatch(client, settings.staffChannel, settings.staffWatchRole, settings.muteRole, settings.moderationRoles), "staffwatch", "sw");

	const logging = Logging(client, settings.channels.logs);

	async function onReady(client: Discord.Client) {
		console.log(`Logged in as ${client.user?.tag}!`);

		const guild = await client.guilds.fetch(settings.discord.guild);
		createVcCleanup(guild);

		const lines = getSomeInfo(settings.debug);
		lines.unshift(getHello());

		const channel = await client.channels.fetch(settings.channels.commands);
		if (!channel || !channel.isSendable()) {
			console.error("Channel does not exist!");
			process.exit(1);
		}
		await channel.send(lines.join("\n"));
	}

	async function onMessageCreate(msg: CommandArguments['msg']) {
		const channel = msg.channel as MessageChannel;
		const user = msg.author;

		if (user.id === client.user?.id) {
			return;
		}

		let content = msg.content;
		if (content[0] !== settings.commandPrefix) {
			return;
		}
		content = content.slice(1);

		const member = await msg.guild?.members.fetch(user.id) || msg.member || undefined;
		const roles = member?.roles.cache;

		let isMod = false;

		for (const mr of settings.moderationRoles) {
			if (roles && roles.has(mr)) {
				isMod = true;
			}
		}

		const cmd = content.split(" ")?.[0] || "";
		functions.call(cmd, { channel, user, member, roles, isMod, msg });

		//msg.reply(`GUILD ID -- ${guild.id}\nMEMBER ID -- ${member.id}\nUSER ID -- ${user.id}\nCONSIDERED MOD -- ${isMod}`);
	}

	client.once(Discord.Events.ClientReady, onReady);
	client.on(Discord.Events.MessageCreate, onMessageCreate);
	client.on(Discord.Events.MessageDelete, logging.messageDelete);
	client.on(Discord.Events.MessageUpdate, logging.messageUpdate);
}
