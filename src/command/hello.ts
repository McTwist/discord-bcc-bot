
import CommandArguments from "./arguments";
import { checkCooldown } from "../cooldown";

const helloEmotes = [":wave:", ":grinning:", ":smile:", ":innocent:", ":wink:", ":blush:", ":sunglasses:", ":clap:", ":thumbsup:", ":v:", ":muscle:", ":metal:"];

export function getHello() {
    return `Hello! ${helloEmotes[Math.floor(Math.random() * helloEmotes.length)]}`;
}

export function createHello() {
    return async function({user, isMod, msg}: CommandArguments) {
        if (checkCooldown(user, isMod, "hello", 3000)) {
            return;
        }

        msg.reply(getHello());
    }
}
