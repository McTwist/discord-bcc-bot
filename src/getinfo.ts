
import os from "node:os";

export default function getSomeInfo(debugMode: boolean) {
    return [
        "```",
        `TIME/DATE    ${new Date().toString()}`,
        `SYS UPTIME   ${os.uptime().toString().formatTime()}`,
        `BOT UPTIME   ${process.uptime().toString().formatTime()}`,
        `OS           ${os.platform()} ${os.release()}`,
        `NODE.JS      ${process.version}`,
        `DEBUG MODE   ${debugMode}`,
        "```"
    ];
}
