
import { GuildTextBasedChannel, User, GuildMember, Collection, Role, OmitPartialGroupDMChannel, Message, PartialGroupDMChannel } from "discord.js";

export type MessageChannel = Exclude<GuildTextBasedChannel, PartialGroupDMChannel>;

export default interface CommandArguments {
    channel: MessageChannel;
    user: User;
    member?: GuildMember;
    roles?: Collection<string, Role>;
    isMod: boolean;
    msg: OmitPartialGroupDMChannel<Message<boolean>>;
};
