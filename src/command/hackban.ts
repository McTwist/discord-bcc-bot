import CommandArguments from "./arguments";

export function createHackban() {
    return function({channel, isMod, msg}: CommandArguments) {
		if (!isMod) {
			return;
		}

		const parts = msg.content.split(" ").slice(1);
		if (!parts.length) {
			msg.reply("You must specify an ID to hackban.");
			return;
		}

		channel.guild.bans.create(parts[0], {deleteMessageSeconds: 7*24*60*60})
			.then(() => msg.reply(`Banned \`${parts[0]}\``));
	}
}
