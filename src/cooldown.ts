
import * as Discord from "discord.js";

const commandCooldowns: Record<string, Record<string, number>> = {};

export function checkCooldown(user: Discord.User, isMod: boolean, cmd: string, cooldownPeriod: number) {
	let now = Date.now();

	if (isMod) {
		return false;
	}

	if (!(user.id in commandCooldowns)) {
		commandCooldowns[user.id] = {};
	}

	if (!(cmd in commandCooldowns[user.id])) {
		commandCooldowns[user.id][cmd] = Date.now();
		return false;
	}

	if (now - commandCooldowns[user.id][cmd] > cooldownPeriod) {
		commandCooldowns[user.id][cmd] = Date.now();
		return false;
	}

	return true;
}
