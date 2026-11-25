
import CommandArguments from "./arguments";
import { checkCooldown } from "../cooldown";
import getSomeInfo from "../getinfo";

export function createInfo(funcs: () => string[], debugMode: boolean) {
    return async function({channel, user, isMod}: CommandArguments) {
        if (checkCooldown(user, isMod, "info", 5000)) {
            return;
        }

        const lines = getSomeInfo(debugMode);
        lines.push("**Available commands**");
        const cmdlineFuncs = funcs();

        lines.push(cmdlineFuncs.join(" \\|\\| "));

        lines.push("\nSource code for the bot is currently unavailable.");

		channel.send(lines.join("\n"));
    }
}
