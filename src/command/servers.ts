
import fs from "node:fs";
import mdEscape from "markdown-escape";

import CommandArguments, { MessageChannel } from "./arguments";
import { checkCooldown } from "../cooldown";

const skipLinesBL = ["END", "START", "FIELDS", ""];

interface ServersConfig {
	bannedBlocklandHosts: string[];
	brickadiaClientVersion: string;
}

const SERVERS_CONFIG_FILE = "./config/servers.json";

function saveServersConfig() {
	fs.writeFileSync(SERVERS_CONFIG_FILE, JSON.stringify(serversConfig, null, 2), 'utf-8');
}

function loadServersConfig(): ServersConfig {
	if (fs.existsSync(SERVERS_CONFIG_FILE)) {
		return JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
	} else {
		return {
			bannedBlocklandHosts: [],
			brickadiaClientVersion: "CL16507",
		};
	}
}

function addBannedHost(host: string) {
	serversConfig.bannedBlocklandHosts.push(host);
	saveServersConfig();
}

const serversConfig = loadServersConfig();

function sendServerList(channel: MessageChannel, sorted: Record<string, string[]>) {
	let servers = [];
	let p = Object.keys(sorted).sort(function(a, b) {return parseInt(b)-parseInt(a)});

	for (let pp in p) {
		let lines = sorted[p[pp]];
		for (let idx in lines) {
			servers.push(lines[idx]);
		}
	}

	if (servers.length) {
		const chunks = [];
		let out = "";
		for (let line of servers) {
			line = line.replace(/\@/gi, "");
			if (out.length + line.length + 1 > 2000) {
				chunks.push(out);
				out = line;
			} else {
				out = `${out}\n${line}`.trimStart();
			}
		}
		if (out.length) {
			chunks.push(out);
		}
		if (chunks.length < 6) {
			for (const chunk of chunks) {
				channel.send(chunk);
			}
		} else {
			channel.send(`Server activity is too high (${servers.length} active servers online).`);
		}
	} else {
		channel.send("No active servers.");
	}
}

async function displayBlockland(channel: MessageChannel) {
	await channel.sendTyping();

	let body: string;
	try {
		const res = await fetch("http://master3.blockland.us");
		const buf = await res.arrayBuffer();
		const textDecoder = new TextDecoder('latin1');
		body = textDecoder.decode(buf);
		if (res.status >= 300) {
			throw body;
		}
	} catch (err: any) {
		channel.send(`Error retrieving master server data.\n\`\`\`\n${err}\n\`\`\``);
		return;
	}
	const rows = body.split("\n").map(function(c) {
		return c.trim().split("\t");
	});

	const sorted: Record<string, string[]> = {};

	for (let idx = 0; idx < rows.length; idx++) {
		const row = rows[idx];
		if (skipLinesBL.indexOf(row[0]) !== -1) {
			continue;
		}
		if (row.length < 10) {
			continue;
		}

		const passworded = (row[2] === "1");

		let host = row[10];
		const title = row[4];

		let banned = false;
		for (let i = 0; i < serversConfig.bannedBlocklandHosts.length; i++)
		{
			if (host == serversConfig.bannedBlocklandHosts[i])
			{
				banned = true;
				break;
			}
		}

		if (banned)
			continue;

		const players = `${row[5]} / ${row[6]}`;
		try {
			host = mdEscape(host);
		} catch(errors) {
			channel.send("Error escaping host data.");
			return;
		}

		if (row[5] !== "0") {
			if (!(row[5] in sorted)) {
				sorted[row[5]] = [];
			}

			let sendTitle = title;
			if (title.trim().length > 0) {
				sendTitle = "**" + mdEscape(title) + "**";
			}

			//console.log(title + " length " + title.length + " " + sendTitle);
			sorted[row[5]].push(`${passworded ? ":lock:" : ""} ${host}'s ${sendTitle}\n:busts_in_silhouette: ${players} players online\n`);
		}
	}

	sendServerList(channel, sorted);
}

async function displayb4v21(channel: MessageChannel) {
	await channel.sendTyping();

	let body: string;
	try {
		const res = await fetch("http://b4v21.block.land/master/index.php")
		body = await res.text();
		if (res.status >= 300) {
			throw body;
		}
	} catch (err: any) {
		channel.send(`Error retrieving master server data.\n\`\`\`\n${err}\n\`\`\``);
		return;
	}
	const rows = body.split("\n").map(function(c) {
		return c.trim().split("\t");
	});

	const sorted: Record<string, string[]> = {};

	for (let idx = 0; idx < rows.length; idx++) {
		const row = rows[idx];
		if (skipLinesBL.indexOf(row[0]) !== -1 || row[0].substring(0, 4) === "NOTE") {
			continue;
		}

		const passworded = (row[2] === "1");

		let host = row[4].substring(0, row[4].indexOf("'s"));
		let title = row[4].substring(row[4].indexOf("'s")+3);
		if (host === "") {
			host = row[4].substring(0, row[4].indexOf("'"));
			title = row[4].substring(row[4].indexOf("'")+2);
		}
		host = mdEscape(host);
		title = mdEscape(title);

		const players = `${row[5]} / ${row[6]}`;

		if (row[5] !== "0") {
			if (!(row[5] in sorted)) {
				sorted[row[5]] = [];
			}

			sorted[row[5]].push(`${passworded ? ":lock:" : ""} ${host}'s **${title}**\n:busts_in_silhouette: ${players} players online\n`);
		}
	}

	sendServerList(channel, sorted);
}

interface BrickadiaServer {
	version: string;
	playerCount: number;
	playerLimit: number;
	passworded: boolean;
	hostName: string;
	name: string;
}

interface BrickadiaAPI {
	servers: BrickadiaServer[];
	currentGameVersion: string;
}

async function displayBrickadia(channel: MessageChannel) {
	async function requestBrickadiaServers(version: string) {
		await channel.sendTyping();

		let body: string;
		try {
			const res = await fetch('https://brickadia.com/api/v1/servers', {
				headers: {
					'User-Agent': `Brickadia/Steam-Shipping-${version} (Release-EA1; Client; Linux)`,
					'Accept': 'application/json',
					'Connection': 'close',
					'Cache-Control': 'max-age=0',
					'Accept-Encoding': 'gzip'
				},
			});
			body = await res.text();
			if (res.status >= 300) {
				throw body;
			}
		} catch (err: any) {
			channel.send(`Error retrieving master server data.\n\`\`\`\n${err}\n\`\`\``);
			return;
		}
		let data: BrickadiaAPI;
		try
		{
			data = JSON.parse(body);
		} catch (err) {
			channel.send("Unable to parse master payload.");
			return;
		}
		if (data.currentGameVersion != serversConfig.brickadiaClientVersion) {
			serversConfig.brickadiaClientVersion = data.currentGameVersion;
			saveServersConfig();
			await requestBrickadiaServers(serversConfig.brickadiaClientVersion);
			return;
		}
		parseServerList(data);
	}

	function parseServerList(data: BrickadiaAPI) {
		const currentGameVersion = data.currentGameVersion;
		const servers = data.servers;

		const sorted: Record<string, string[]> = {};

		for (let idx in servers) {
			const serverData = servers[idx];

			if (serverData.version !== currentGameVersion) {
				continue;
			}

			if (serverData.playerCount <= 0) {
				continue;
			}

			const passworded = serverData.passworded;

			const host = mdEscape(serverData.hostName);
			const title = mdEscape(serverData.name);
			const players = `${serverData.playerCount} / ${serverData.playerLimit}`;

			if (!(serverData.playerCount in sorted)) {
				sorted[serverData.playerCount] = [];
			}

			sorted[serverData.playerCount].push(`${passworded ? ":lock:" : ""} ${host}'s **${title}**\n:busts_in_silhouette: ${players} players online\n`);
		}

		sendServerList(channel, sorted);
	}

	await requestBrickadiaServers(serversConfig.brickadiaClientVersion);
}

export function createServers() {
    return async function({channel, user, isMod, msg}: CommandArguments) {
		const availableGames: Record<string, string> = {
			blockland: "blockland",
			bl: "blockland",
			brickadia: "brickadia",
			br: "brickadia",
			b4v21: "b4v21",
		};

		const parts = msg.content.toLowerCase().split(" ").splice(1);
		let wantedGame;

		if (!parts.length) {
			msg.reply(`Available games: ${[...new Set(Object.values(availableGames))].join(", ")}`);
			return;
		} else {
			if (!(parts[0] in availableGames)) {
				msg.reply(`Available games: ${[...new Set(Object.values(availableGames))].join(", ")} [\`${parts[0]}\` not in availableGames]`);
				return;
			}
			wantedGame = availableGames[parts[0]];
		}

		switch (wantedGame) {
		case "blockland":
			if (checkCooldown(user, isMod, "serversBL", 15000)) {
				return;
			}
			if (parts.length >= 3 && isMod) {
				if (parts[1] === "ban") {
					const host = msg.content.split(" ").slice(3).join(" ");
					addBannedHost(host);
					msg.reply("Banned host from server list");
				} else {
					msg.reply(`Unknown action "${parts[1]}"`);
				}
			} else {
				await displayBlockland(channel);
			}
			break;
		case "b4v21":
			if (checkCooldown(user, isMod, "serversBL", 15000)) {
				return;
			}
			await displayb4v21(channel);
			break;
		case "brickadia":
			if (checkCooldown(user, isMod, "serversBR", 15000)) {
				return;
			}
			await displayBrickadia(channel);
			break;
		case "banhost":
			if (!isMod || parts.length < 2) {
				return;
			}
			addBannedHost(parts[1]);
			break;
		}
	}
}
