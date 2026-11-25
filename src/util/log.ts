import Client from "../client";

export function createLog(client: Client, debugMode: boolean, commands: string) {
    return function log(data: any) {
        console.log(data);
    
        if (!debugMode) {
            return;
        }
    
        const channel = client.getChannel(commands);
        if (channel?.isSendable()) {
            channel.send(`[DEBUG] ${data}`);
        }
    }
}
