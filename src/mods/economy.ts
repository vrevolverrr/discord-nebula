import * as discord from 'discord.js';
import * as db from '../core/database';

export function parseCurrencyAmount(user: db.IUser, amount: string): number | undefined {
    /**
     * Parses a string from a Discord command as currency amount
     * 
     * @param {db.IUser} user - The user profile of the user
     * @param {string} amount - The amount of currency as string
     * @returns {number | undefined} - The amount parsed as a number or undefined for invalid amount
     */
    if (amount == "a" || amount == "all") {
        return user.balance;
    }
    var amountValue: number = parseInt(amount);
    if (Number.isNaN(amountValue)) {
        return undefined;
    }
    return amountValue;
}

export async function transfer(user1: discord.User, user1Profile: db.IUser, user2: discord.User, amount: number): Promise<void> {
    /**
     * Transfers money from one user to another
     * 
     * @param {discord.User} user1 - The user transferring the money
     * @param {db.IUser} user1Profile - The user profile of the user transferring the money
     * @param {discrd.User} user2 - The user receiving the money
     * @param {number} amount - The amount of money being transferred
     */
    if (user1.id !== "309642430532157440") await db.updateUser(user1.id, "balance", user1Profile.balance - amount);
    const targetUser = await db.fetchUser(user2.id);
    await db.updateUser(user2.id, "balance", targetUser.balance + amount)
}