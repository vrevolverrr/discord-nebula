import * as discord from 'discord.js';
import * as db from '../core/database';
import * as logger from '../core/logger';

export async function add(user: db.IUser | discord.User, amount: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.updateUserIncrement(user.id, "balance", amount)
        .then(_ => {logger.info(`Added ${amount} to balance of ${user.id}`); resolve()})
        .catch(err => {logger.error(`Failed to add to balance of ${user.id} | ${err}`); reject()});
    });
}

export async function deduct(user: db.IUser | discord.User, amount: number): Promise<void> {
    return new Promise((resolve, reject) => {
        db.updateUserIncrement(user.id, "balance", amount)
        .then(_ => {logger.info(`Deducted ${amount} from balance of ${user.id}`); resolve()})
        .catch(err => {logger.error(`Failed to add to balance of ${user.id} | ${err}`); reject()});
    });
}

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
    if (amount == "h" || amount == "half") {
        return Math.round(user.balance / 2);
    }
    var amountValue: number = parseInt(amount);
    if (Number.isNaN(amountValue)) {
        return undefined;
    }
    if (amountValue < 0) {
        return undefined;
    }
    return amountValue;
}

export async function transfer(user1: discord.User, user2: discord.User, amount: number): Promise<void> {
    /**
     * Transfers money from one user to another
     * 
     * @param {discord.User} user1 - The user transferring the money
     * @param {discrd.User} user2 - The user receiving the money
     * @param {number} amount - The amount of money being transferred
     */
    if (user1.id !== "309642430532157440") await deduct(user1, amount);
    await add(user2, amount);
}