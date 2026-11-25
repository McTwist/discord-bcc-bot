import fs from "node:fs"; 

function readSecret(name: string) {
    const secretPath = `/run/secrets/${name}`;
    try {
        return fs.readFileSync(secretPath, 'utf8').trim();
    } catch (e) {
        return process.env[name.toUpperCase()];
    }
}

export function retrieveToken() {
    const token = readSecret('token');
    if (!token) {
        console.error("Missing token");
        process.exit(1);
    }
    return token;
}
