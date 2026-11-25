import { Client } from "discord.js";
import { Message, OmitPartialGroupDMChannel, PartialMessage } from "discord.js";

type OldMessage = OmitPartialGroupDMChannel<Message<boolean>> | PartialMessage<boolean>;
type NewMessage = OmitPartialGroupDMChannel<Message<boolean>>;

export default function Logging(client: Client, logsChannel: string) {
    async function messageDelete(message: OldMessage) {
        if (!message.author || !message.member) {
            return;
        }
        if (message.author?.id === client.user?.id) {
            return;
        }
    
        const now = new Date();
        const timestr = [now.getHours(), now.getMinutes().toString().padStart(2, '0'), now.getSeconds().toString().padStart(2, '0')].join(":");
        const whom = [message.author.username, message.author.discriminator].join("#");
        const where = `<#${message.channel.id}>`;
    
        const lines = [
            `\`[${timestr}]\` A message from **${whom}** \`(${message.member.id})\` was :x: *deleted* from ${where}`,
            "```",
            message.cleanContent?.substring(0, 1500),
            "```"
        ];
    
        const channel = await client.channels.fetch(logsChannel);
        if (channel?.isSendable()) {
            channel.send(lines.join("\n"));
        }
    }

    async function messageUpdate(oldMessage: OldMessage, newMessage: NewMessage) {
        if (!oldMessage.author || !oldMessage.member) {
            return;
        }
        if (oldMessage.author.id === client.user?.id) {
            return;
        }
    
        if (oldMessage.cleanContent === newMessage.cleanContent) {
            return;
        }
    
        const now = new Date();
        const timestr = [now.getHours(), now.getMinutes().toString().padStart(2, '0'), now.getSeconds().toString().padStart(2, '0')].join(":");
        const whom = [oldMessage.author.username, oldMessage.author.discriminator].join("#");
        const where = `<#${oldMessage.channel.id}>`;
    
        let lines = [
            `\`[${timestr}]\` A message from **${whom}** \`(${oldMessage.member.id})\` was :pencil2: *modified* from ${where}`,
            "**BEFORE**",
            "```",
            oldMessage.cleanContent?.substring(0, 1500),
            "```"
        ];
    
        const channel = await client.channels.fetch(logsChannel);
        if (!channel || !channel.isSendable()) {
            return;
        }
        await channel.send(lines.join("\n"));
    
        lines = [
            "**AFTER**",
            "```",
            newMessage.cleanContent.substring(0, 1500),
            "```"
        ];
    
        await channel.send(lines.join("\n"));
    }

    return {
        messageDelete,
        messageUpdate
    };
}
