import { Role } from "discord.js";

import CommandArguments from "./arguments";


export function createRole(toggleableRoles: string[]) {
    return async function({member, roles, msg}: CommandArguments) {
        const content = msg.content;
        const parts = content.toLowerCase().split(" ").slice(1);

        if (parts.length == 0) {
            msg.reply(`You must specify a role.\n\n**Available roles:** ${toggleableRoles.join(", ")}`);
            return;
        }

        const roleWanted = parts.join(" ");

        const roleList = toggleableRoles.slice(0).map(function(r) {
            return r.toLowerCase();
        });

        if (roleList.indexOf(roleWanted) === -1) {
            msg.reply("This is not a toggleable role.");
            return;
        }

        let mentionableRole: Role | undefined;
        let wantedRole: Role | undefined;
        const guild = msg.guild;
        if (!guild) {
            msg.reply("Command can only be called within a server.");
            return;
        }
        const guildRoles = await guild.roles.fetch();

        guildRoles.forEach(role => {
            const name = role.name.toLowerCase();

            if (name == "mentionable") {
                mentionableRole = role;
            }
            if (name == roleWanted) {
                wantedRole = role;
            }
        });

        if (!wantedRole) {
            msg.reply(`Role "${roleWanted}" is not valid.`);
            return;
        }

        const rolesHas = roles;
        let hasWantedRole = false;
        let mentionableRoleCount = 0;

        rolesHas?.forEach(h => {
            const name = h.name.toLowerCase() || "";

            if (name == roleWanted) {
                hasWantedRole = true;
            }

            if (name.indexOf("mentionable") !== -1 && name.indexOf(" ") !== -1) {
                mentionableRoleCount++;
            }
        });

        if (hasWantedRole) {
            if (mentionableRoleCount === 1 && wantedRole.name.toLowerCase().indexOf("mentionable") !== -1) {
                console.log("Removed mentionable role");
            }
            member?.roles.remove(wantedRole);
            msg.reply(`You no longer have the ${wantedRole?.name} role.`);
        } else if (mentionableRole) {
            if (mentionableRoleCount === 0 && wantedRole.name.toLowerCase().indexOf("mentionable") !== -1) {
                member?.roles.add(mentionableRole);
            }
            member?.roles.add(wantedRole);
            msg.reply(`You now have the ${wantedRole.name} role.`);
        } else {
            msg.reply(`Role "${roleWanted}" is not valid.`);
        }
    };
}
