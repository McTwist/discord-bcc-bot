import { Client } from "discord.js";

import CommandArguments from "./arguments";

// TODO: Fix this mess, and make it smarter

function filterNull<T>(l: (T | null)[]) {
    return l.filter(a => a !== null);
}

function extractEmote(emote: string) {
    if (emote.startsWith('<')) {
        const matches = emote.match(/<\:[^\:]+\:(\d+)/);
        if (matches) {
            return matches[1];
        } else {
            return emote;
        }
    } else {
        return emote;
    }
}

export function createStaffwatch(client: Client, staffChannel: string, staffWatchRole: string, muteRole: string, moderationRoles: string[]) {
    return async function({channel, isMod, msg}: CommandArguments) {
        if (!isMod) {
            return;
        }

        const parts = msg.content.split(" ").slice(1);
        if (parts.length < 1) {
            msg.reply("No message ID is present. (1st arg)");
            return;
        }

        if (parts.length < 2) {
            msg.reply("No raffle emote is present. (2nd arg)");
            return;
        }
        const messageSearch = parts[0];
        const emote = parts[1];

        const safeEmote = extractEmote(emote);

        const channels = client.channels.cache;
        await channel.sendTyping();
        const messages = await Promise.all(channels
            .filter(ch => ch.isTextBased())
            .map(ch => ch.messages.fetch(messageSearch).catch(() => null)));
        
        try {
            await Promise.all(
                filterNull(messages)
                .map(async wantedMessage => {
                    const wantedReaction = wantedMessage.reactions.resolve(safeEmote);
                    if (!wantedReaction) {
                        channel.send(`Could not find reaction ${emote}`);
                        return;
                    }
                    if (wantedReaction.count === 0) {
                        channel.send(`No reactions on ${emote}`);
                        return;
                    }
                    const members = wantedMessage.guild?.members;
                    if (!members) {
                        channel.send("Message not part of guild");
                        return;
                    }
                    const eout: string[] = [];
                    const users = await wantedReaction.users.fetch();
                    const guildMembers = await members.fetch({user: [...users.values()]});
                    const out = filterNull(guildMembers.map(guildMember => {
                        const roles = guildMember.roles.cache;
                        if (roles.has(staffWatchRole)) {
                            eout.push(`<@${guildMember.user.id}> -- *previously Staff Watch*`);
                            return null;
                        } else if (roles.has(muteRole)) {
                            eout.push(`<@${guildMember.user.id}> -- *muted*`);
                            return null;
                        } else if (roles.hasAny(...moderationRoles)) {
                            eout.push(`<@${guildMember.user.id}> -- *is considered a staff member*`);
                            return null;
                        }
                        return guildMember;
                    }))
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 5)
                    .map(guildMember => {
                        guildMember.roles.add(staffWatchRole);
                        return `<@${guildMember.user.id}>`;
                    });

                    if (out.length === 0) {
                        return;
                    }

                    const role = await wantedMessage.guild?.roles.fetch(staffWatchRole);
                    const previousMembers = [...(role?.members.values() || [])];
                    await Promise.all(previousMembers.map(async member => {
                        await member.roles.remove(staffWatchRole);
                    }));
                    const staffTextChannel = await client.channels.fetch(staffChannel);
                    if (staffTextChannel?.isSendable()) {
                        staffTextChannel.send(`:warning: THIS IS A TEST :warning:\n**Setting staff watch to:**\n${out.join("\n")}\n\n**Excluded from drawing:**\n${eout.join("\n")}`);
                    }
                })
            );
        } catch (_) {}
    };
}
