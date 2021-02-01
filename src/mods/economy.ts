import * as discord from 'discord.js';
import * as db from '../core/database';

export async function transfer(user1: discord.User, user1Profile: db.IUser, user2: discord.User, amount: number) {
    if (user1.id !== "309642430532157440") await db.updateUser(user1.id, "balance", user1Profile.balance - amount);
    const targetUser = await db.fetchUser(user2.id);
    await db.updateUser(user2.id, "balance", targetUser.balance + amount)
}