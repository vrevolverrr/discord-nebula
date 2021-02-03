import * as db from '../core/database';
import * as logger from '../core/logger';

export function levelXP(level_n: number): number {
        /**
     * Calculates the total XP required to reach a given level
     * 
     * @param {number} level_n - The XP requirement of the nth level
     * @returns {number} - The XP requirement
     */
    return Math.round(Math.log10(level_n ** level_n) * 1000);
}

export function getLevel(xp: number): number {
    /**
     * Calculates the level given the current XP value
     * 
     * @param {number} xp - The current XP value
     * @returns {number} - The current level
     */
    var i = 1;

    while (true) {
        if (xp / levelXP(i) < 1) {
            return i - 1;
        } else i++;
    }
}

export class XPManager {
    /**
     * This class contains the static methods needed
     * to manage user XP and levels
     */

    // Constants
    static CHAT_XP_PER_MESSAGE = 3
    static VOICE_XP_PER_INTERVAL = 4
    static INTERVAL_TIME = 10000;

    // Timers
    static voiceXPMonitor: any;
    static databaseXP: any;

    // Users
    static users: Map<string, number> = new Map();;
    static activeUsers: string[] = [];
    static usersHasChanged: boolean = false;

    static increaseVoiceXP = (userID: string): void => {
        /**
         * Awards XP to a user for voice activity
         * 
         * @param {string} userID - The ID of the Discord user
         */
        XPManager.usersHasChanged = true;
        const value = XPManager.users.get(userID);
        if (value == undefined) XPManager.users.set(userID, XPManager.VOICE_XP_PER_INTERVAL)
        else XPManager.users.set(userID, value + XPManager.VOICE_XP_PER_INTERVAL);
    };
    static increaseChatXP = (userID: string): void => {
        /**
         * Awards XP to a user for chat activity
         * 
         * @param {string} userID - The ID of the Discord user
         */
        XPManager.usersHasChanged = true;
        const value = XPManager.users.get(userID);
        if (value == undefined) XPManager.users.set(userID, XPManager.CHAT_XP_PER_MESSAGE);
        else XPManager.users.set(userID, value + XPManager.CHAT_XP_PER_MESSAGE);
    };
    static setUserActive = (userID: string) => {
        /**
         * Grants the user eligibility to gain voice activity XP
         * 
         * @param {string} userID - The ID of the Discord user
         */
        XPManager.activeUsers.push(userID);
    };
    static setUserInactive = (userID: string) => {
        /**
         * Denies the user eligibility to gain voice activity XP
         * 
         * @param {string} userID - The ID of the Discord user
         */
        for (var i = 0; i++; i < XPManager.activeUsers.length) {
            if (XPManager.activeUsers[i] == userID) XPManager.activeUsers.splice(i, 1);
        }
    };
    static startVoiceXPMonitor = () => {
        /**
         * Starts the interval function to periodically award voice activity XP to users
         */
        XPManager.voiceXPMonitor = setInterval(() => {
            for (const userID of XPManager.activeUsers) {
                XPManager.increaseVoiceXP(userID);
            }
        }, XPManager.INTERVAL_TIME);
        logger.info("Started voice XP monitor interval function");
    }

    static stopVoiceXPMonitor = () => {
        /**
         * Stops the interval function to periodically award voice activity XP to users
         */
        clearInterval(XPManager.voiceXPMonitor);
        logger.info("Stopped voice XP monitor interval function");
    }

    static startUpdateDatabaseXP = () => {
        /**
         * Starts the interval function to periodically update user XP values in the database
         */
        XPManager.databaseXP = setInterval(async () => {
            if (!XPManager.usersHasChanged) return;
            // Only update if there were changes
            const entries = XPManager.users.entries();
            const requests: Promise<any>[] = [];
            while (true) {
                const entry = entries.next()
                if (entry.done) break;
                requests.push(
                    db.updateUserIncrement(entry.value[0], "xp", entry.value[1])
                    .then(_ => XPManager.users.delete(entry.value[0]))
                );
            }
            await Promise.all(requests);
            XPManager.usersHasChanged = false;
            logger.info("Updated database XP values");
            
        }, XPManager.INTERVAL_TIME * 10);
        logger.info("Started update database XP interval function");
    }
    
    static stopUpdateDatabaseXP = () => {
        /**
         * Stops the interval function to periodically update user XP values in the database
         */
        clearInterval(XPManager.databaseXP);
        logger.info("Stopped update database XP interval function");
    }
}