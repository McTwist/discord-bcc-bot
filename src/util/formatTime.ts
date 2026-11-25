
declare interface String {
    formatTime(): string;
}

String.prototype.formatTime = function (this: string) {
    var sec_num = parseInt(this, 10);

    var seconds = sec_num % 60;
    var minutes = Math.floor(sec_num / 60) % 60;
    var hours = Math.floor((sec_num / 60) / 60) % 24;
    var days = Math.floor(((sec_num / 60) / 60) / 24);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
