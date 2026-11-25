import fs from "node:fs";
import Sentencer from "sentencer";

import * as Discord from "discord.js";

import CommandArguments from "./arguments";
import { checkCooldown } from "../cooldown";

interface Voice {
	channelId: string;
	ownerId: string;
	textChannelId: string;
	persistent: boolean;
	bitrate: number;
	vacancyCheck: number;
}

type VoiceData = Record<string, Voice>;

const VOICE_CONFIG_FILE = "./config/voice.json";
const CLEANUP_SECONDS = 120;

function loadVoiceData(): VoiceData {
	if (fs.existsSync(VOICE_CONFIG_FILE)) {
		return JSON.parse(fs.readFileSync(VOICE_CONFIG_FILE, 'utf-8'));
	} else {
		return {};
	}
}

function saveVoiceData() {
	fs.writeFileSync(VOICE_CONFIG_FILE, JSON.stringify(voiceData, null, 2), 'utf-8');
}

const voiceData = loadVoiceData();

export function createVc(client: Discord.Client, commands: string, voiceCategory: string) {
	return async function({channel, user, member, isMod, msg}: CommandArguments) {
		if (!member) {
			return;
		}

		if (!(member.id in voiceData) && channel.id !== commands) {
			msg.reply(`To create your own voice channel, use \`!vc\` in <#${commands}>`)
			return;
		}
		if (channel.id !== commands && channel.id !== voiceData[member.id].textChannelId) {
			return;
		}

		const opts = "**Available options/commands**: bitrate [kbps], userLimit [users], persist [0|1], newName, delete";

		if (member.id in voiceData) {
			const voiceChannel = await client.channels.fetch(voiceData[member.id].channelId);
			if (voiceChannel?.isVoiceBased()) {
				if (channel.id === commands) {
					msg.reply(`You already have an active voice channel. (${voiceChannel.name})`);
				} else if (channel.id === voiceData[member.id].textChannelId) {
					const parts = msg.content.split(" ").slice(1);
					if (!parts.length) {
						msg.reply(opts);
						return;
					}

					const guild = voiceChannel.guild;

					switch (parts[0].toLowerCase()) {
					case "bitrate":
						if (checkCooldown(user, isMod, "vcBitrate", 2000)) { return; }

						const bitrate = parseInt(parts[1]);
						if (bitrate < 8000) {
							msg.reply("Bitrate needs to be at least 8000.");
						} else {
							voiceChannel.setBitrate(bitrate);
							msg.reply(`Bitrate set to ${parts[1]}kbps`);
						}
						break;

					case "userlimit":
						if (checkCooldown(user, isMod, "vcUserLimit", 2000)) { return; }

						const userCount = parseInt(parts[1] || "0");
						voiceChannel.setUserLimit(userCount);
						msg.reply(`User limit set to ${userCount} users`);
						break;

					case "persist":
						if (!isMod) {
							msg.reply("Only moderators can make their channels persist.");
							return;
						}

						if (parts[1] === "1") {
							msg.reply("This voice channel will now persist");
							voiceData[member.id].persistent = true;
						} else {
							msg.reply("This voice channel will no longer persist");
							voiceData[member.id].persistent = false;
						}
						saveVoiceData();
						break;

					case "newname":
						if (checkCooldown(user, isMod, "vcName", 60000)) { return; }

						const newName = generateVCName();
						voiceChannel.setName(newName);
						const textChannel = guild.channels.cache.get(voiceData[member.id].textChannelId);
						if (textChannel) {
							textChannel.setName(newName);
						}
						msg.reply(`Channel renamed to **${newName}**`);
						break;

					case "delete":
						Promise.all([
							voiceChannel.delete(),
							guild.channels.cache.get(voiceData[member.id].textChannelId)?.delete()
						]).then(() => {
							removeVC(member.id);
							saveVoiceData();
						});
						break;

					default:
						msg.reply(opts);
						break;
					}
				}
				return;
			}
		}

		if (checkCooldown(user, isMod, "vc", 30000)) { return; }

		const VCid = generateVCName();
		const guild = channel.guild;
		try {
			const [voiceChannel, textChannel] = await Promise.all([
				guild.channels.create({
					name: `${VCid}`,
					type: Discord.ChannelType.GuildVoice,
					parent: voiceCategory,
					position: 0
				}),
				guild.channels.create({
					name: `${VCid}`,
					type: Discord.ChannelType.GuildText,
					parent: voiceCategory,
					position: 0
				})
			]);
			voiceData[member.id] = {
				channelId: voiceChannel.id,
				ownerId: member.id,
				textChannelId: textChannel.id,
				persistent: false,
				bitrate: 64,
				vacancyCheck: 0
			};

			saveVoiceData();

			msg.reply(`Created voice channel **${VCid}** and respective text channel <#${textChannel.id}>`);
		} catch (err: any) {
			console.error(err);
		}
	}
}

export function createVcid() {
	return async function({channel, user, isMod}: CommandArguments) {
		if (checkCooldown(user, isMod, "vcid", 1500)) {
			return;
		}

		if (Date.now() % 2) {
			channel.send(Sentencer.make("{{ an_adjective }} {{ noun }}"));
		} else {
			channel.send(Sentencer.make("{{ adjective }} {{ nouns }}"));
		}
	};
}

export function createVcCleanup(guild: Discord.Guild) {
	async function vcCleanup() {
		let removed = false;
		for (const memberId in voiceData) {
			const channelData = voiceData[memberId];

			if (channelData.persistent) {
				continue;
			}

			const channel = guild.channels.cache.get(channelData.channelId);
			const textChannel = guild.channels.cache.get(channelData.textChannelId);
			if (!channel || !textChannel || !channel.isVoiceBased() || !textChannel.isTextBased()) {
				removeVC(memberId);
				continue;
			}

			const members = channel.members;
			if (members.size <= 0) {
				channelData.vacancyCheck++;

				if (channelData.vacancyCheck == 1) {
					textChannel.send(`:warning: This voice channel will be deleted in ${CLEANUP_SECONDS / 60} minutes if the channel remains vacant!`);
				} else if (channelData.vacancyCheck == 2) {
					await Promise.all([
						channel.delete(),
						textChannel.delete()
					]);
					removeVC(memberId);
					removed = true;
				}
			} else {
				channelData.vacancyCheck = 0;
			}
		}

		if (removed) {
			saveVoiceData();
		}

		//let staff = guild.channels.get(settings.staffChannel);
		//staff.send("Ran tick for VC cleanup");
	}
	vcCleanup();
	const vcCleanupInterval = setInterval(vcCleanup, CLEANUP_SECONDS * 1000);
}

function removeVC(snowflake: string) {
	delete voiceData[snowflake];
	//log(`[VOICE CHANNELS] vc pertaining to voiceData for ${snowflake} didn't exist? removed data`);
	//saveVoiceData();
}

function generateVCName() {
	return Sentencer.make(`{{ adjective }} {{ ${Date.now() % 2 ? "noun" : "nouns"} }}`).split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')
}
