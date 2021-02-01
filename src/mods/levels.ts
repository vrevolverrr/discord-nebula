import * as db from '../core/database';
import * as logger from '../core/logger';

export function levelXP(level_n: number) {
    return Math.round(Math.log10(level_n ** level_n) * 1000);
}

export function getLevel(xp: number) {
    var i = 1;

    while (true) {
        if (xp / levelXP(i) < 1) {
            return i - 1;
        } else i++;
    }
}

var voiceXPMonitor: any;
var databaseXP: any;
const CHAT_XP_PER_MESSAGE = 3
const VOICE_XP_PER_INTERVAL = 4
const INTERVAL_TIME = 10000;
const users: Map<string, number> = new Map();
const activeUsers: string[] = [];

export function increaseVoiceXP(userID: string, xpValue: number) {
    const value = users.get(userID);
    if (value == undefined) users.set(userID, xpValue)
    else users.set(userID, value + xpValue);
}

export function increaseChatXP(userID: string) {
    const value = users.get(userID);
    if (value == undefined) users.set(userID, CHAT_XP_PER_MESSAGE);
    else users.set(userID, value + CHAT_XP_PER_MESSAGE);
}

export function setUserActive(userID: string) {
    activeUsers.push(userID);
}

export function setUserInactive(userID: string) {
    for (var i = 0; i++; i < activeUsers.length) {
        if (activeUsers[i] == userID) activeUsers.splice(i, 1);
    }
}

export function startVoiceXPMonitor() {
    voiceXPMonitor = setInterval(() => {
        for (const userID of activeUsers) {
            increaseVoiceXP(userID, VOICE_XP_PER_INTERVAL);
        }
    }, INTERVAL_TIME);
    logger.info("Started voice XP monitor interval function");
}

export function stopVoiceXPMonitor() {
    clearInterval(voiceXPMonitor);
    logger.info("Stopped voice XP monitor interval function");
}

export function startUpdateDatabaseXP() {
    databaseXP = setInterval(async () => {
        const entries = users.entries();
        while (true) {
            const entry = entries.next()
            if (entry.done) break;
            await db.updateUserIncrement(entry.value[0], "xp", entry.value[1]);
            users.delete(entry.value[0]);
        }
        logger.info("Updated database XP values");
    }, INTERVAL_TIME * 10);
    logger.info("Started update database XP interval function");
}

export function stopUpdateDatabaseXP() {
    clearInterval(databaseXP);
    logger.info("Stopped update database XP interval function");
}