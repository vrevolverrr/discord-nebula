import * as discord from 'discord.js';
import * as db from '../core/database';

export async function coinflip(user: discord.User, userProfile: db.IUser, betDirection: boolean, betAmount: number): Promise<Array<string>> {
    /**
     * The coinflip gambling game
     * 
     * @param {discord.User} user - The Discord user object usually obtained from message.author
     * @param {db.IUser} userProfile - The database object of the user
     * @param {boolean} betDirection - The side of coin to bet on. True for heads and False for tails
     * @param {number} betAmount - The amount of money to bet with.
     * @returns {Array<string>} - Returns the rolled direction (heads / tails), outcome (win / lose) and the profit ( = betAmount)
     */
    const rollDirectionBool: boolean = Math.random() > 0.5;
    const profit = (betDirection == rollDirectionBool) ? betAmount : -betAmount
    const rollDirection: string = (rollDirectionBool) ? "heads" : "tails";
    const outcome: string = (profit > 0) ? "won" : "lost";

    await db.updateUser(user.id, "balance", userProfile.balance + profit);

    return [rollDirection, outcome, Math.abs(profit).toString(), (userProfile.balance + profit).toString()]
}

export function getCoinflipBet(betDirection: string) {
    /**
     * Returns coinflip bet as true or false states
     * 
     * @param {string} betDirection - The side of coin to bet on
     * @returns {boolean | undefined} - Returns true for heads, false for tails, undefined for unknown bet
     */
    switch(betDirection) {
        case "heads":
            return true;
        case "head":
            return true;
        case "h":
            return true;
        case "tails":
            return false;
        case "tail":
            return false;
        case "t":
            return false;
        default:
            return undefined;
    }
}