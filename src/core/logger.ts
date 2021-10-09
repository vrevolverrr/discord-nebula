import * as fs from 'fs';

export var ENABLE_LOGGING: boolean = true;
export var LOG_TO_FILE: boolean = true;
export var MAX_LOG_SIZE: number = 2048 * 10**6;
export var LOG_FOLDER_PATH: string = "logs";

const logFileStream: fs.WriteStream = prepareFileStream();

export function info(message: any) {
    if (!ENABLE_LOGGING) return;
    if (!(typeof message == "string")) var msg: string = message.toString();
    else var msg: string = message;

    const logString: string = `[${new Date(Date.now()).toISOString()}] [INFO] ${msg}\n`;

    if (LOG_TO_FILE) logFileStream.write(logString);
    process.stdout.write(logString);
}

export function warn(message: any) {
    if (!ENABLE_LOGGING) return;
    if (!(typeof message == "string")) var msg: string = message.toString();
    else var msg: string = message;

    const logString: string = `[${new Date(Date.now()).toISOString()}] [WARN] ${msg}\n`;

    if (LOG_TO_FILE) logFileStream.write(logString);
    process.stdout.write(logString);
}

export function debug(message: any) {
    if (!ENABLE_LOGGING) return;
    if (!(typeof message == "string")) var msg: string = message.toString();
    else var msg: string = message;

    const logString: string = `[${new Date(Date.now()).toISOString()}] [DEBUG] ${msg}\n`;

    if (LOG_TO_FILE) logFileStream.write(logString);
    process.stdout.write(logString);
}

export function error(message: any) {
    if (!ENABLE_LOGGING) return;
    if (!(typeof message == "string")) var msg: string = message.toString();
    else var msg: string = message;

    const logString: string = `[${new Date(Date.now()).toISOString()}] [ERROR] ${msg}\n`;

    if (LOG_TO_FILE) logFileStream.write(logString);
    process.stdout.write(logString);
}

function prepareFileStream() {
    const logFileDir: string[] = fs.readdirSync(LOG_FOLDER_PATH);
    var activeLogFile: string;

    if (logFileDir.length > 0) {
        const logFileTimestamps: number[] = [];
        for (const log of logFileDir) {
            logFileTimestamps.push(parseInt(log.split("-")[1].split(".")[0]));
        }
        
        activeLogFile = `NEBULABOT-${Math.max(...logFileTimestamps)}.log`;

        if (fs.statSync(`${LOG_FOLDER_PATH}/${activeLogFile}`).size >= MAX_LOG_SIZE) {
            activeLogFile = `NEBULABOT-${Date.now().toString()}.log`
        }
        
    } else activeLogFile = `NEBULABOT-${Date.now().toString()}.log`;

    const activeLogPath = `${LOG_FOLDER_PATH}/${activeLogFile}`

    return fs.createWriteStream(activeLogPath, {flags: "a"});
}