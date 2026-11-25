
import * as Discord from "discord.js";

class Client {
    private client: Discord.Client;
    private guild?: Discord.Guild;

    constructor(client: Discord.Client) {
        this.client = client;
    }

    prepareGuild(guildId: string) {
        const checkGuild = this.client.guilds.cache.get(guildId);
		if (!checkGuild) {
			throw Error("no valid guild");
        }
		this.guild = checkGuild;
    }

    getChannel(channelId: string) {
        return this.client.channels.cache.get(channelId);
    }

    getMember(userId: string, def?: Discord.GuildMember) {
        return this.guild?.members.cache.get(userId) || def;
    }

    getClient() {
        return this.client;
    }

    getGuild() {
        if (!this.guild) {
            throw Error("no guild found");
        }
        return this.guild;
    }
}
