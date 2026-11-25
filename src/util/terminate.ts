
function terminate(signal: string) {
    // Quicker closing down
    process.exit(0);
}
process.on('SIGINT', terminate);
process.on('SIGTERM', terminate);
