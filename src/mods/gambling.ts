import * as discord from 'discord.js';
import * as db from '../core/database';

export async function coinflip(user: discord.User, userProfile: db.IUser, betDirection: boolean, betAmount: number): Promise<Array<string>> {
    /**
     * @param {discord.User} - The Discord user object usually obtained from message.author
     * @param {boolean} betDirection - The side of coin to bet on. True for heads and False for tails
     * @param {number} betAmount - The amount of money to bet with.
     * @returns {Array<string>} - Returns the rolled direction (heads / tails), outcome (win / lose) and the profit ( = betAmount)
     */
    const rollDirectionBool: boolean = Math.random() > 0.5;
    const profit = (betDirection == rollDirectionBool) ? betAmount : -betAmount
    const rollDirection: string = (rollDirectionBool) ? "heads" : "tails";
    const outcome: string = (profit > 0) ? "won" : "lost";

    await db.updateUser(user.id, "balance", userProfile.balance + profit);

    return [rollDirection, outcome, Math.abs(profit).toString()]
}