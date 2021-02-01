import * as discord from 'discord.js';
import * as lib from '../core/lib';
import * as db from '../core/database';
import { EmbedField } from '../core/bot';
import { getLevel, levelXP } from '../mods/levels';

export function match(user1: discord.User, user2: discord.User): EmbedField[] {
    /**
     * Calculates the pseudocompatibility between two users by obtaining the sum of username hashcodes
     * 
     * @param {discord.User} user1 - The first Discord user to match
     * @param {discord.User} user2 - The second Discord user to match
     * @returns {EmbedField[]} - An array of EmbedFields containing the results
     */
    var conclusion: string = "";
    var resultValue: number = Math.abs((lib.hash(user1.username) + lib.hash(user2.username)) % 101);

    switch (true) {
        case (resultValue >= 90):
            conclusion = "💖 Matchmade in heaven";
            break
        case (resultValue >= 80):
            conclusion = "❤️ The perfect couple";
            break;
        case (resultValue >= 70):
            conclusion = "🧡 Love doves";
            break
        case (resultValue >= 60):
            conclusion = "💛 Cute together";
            break;
        case (resultValue >= 50):
            conclusion = "💜 Your average couple";
            break;            
        case (resultValue >= 40):
            conclusion = "🤍 Will it work?";
            break;
        case (resultValue >= 30):
            conclusion = "💙 Questionable";
            break;
        case (resultValue >= 20):
            conclusion = "💚 A waste of time";
            break;
        case (resultValue >= 10):
            conclusion = "🤎 Bad investment"
            break;
        case (resultValue >= 0):
            conclusion = "🖤 Natural disaster";
            break;
        }

        if (user1 == user2) {
            resultValue = 100; 
            conclusion = "💕 Love yourself";
        }

        const fields: EmbedField[] = [];
        fields.push({name: "Person 1", value: user1.username, inline: true});
        fields.push({name: "Person 2", value: user2.username, inline: true});
        fields.push({name: "Match Score", value: `${resultValue.toString()}/100`, inline: true});
        fields.push({name: "Conclusion", value: conclusion})
        
        return fields;
}

export async function createProfileEmbed(message: discord.Message, user: db.IUser): Promise<discord.MessageEmbed> {
    /**
     * Creates the profile embed of a user
     * 
     * @param {discord.Message} message - The Discord message object
     * @param {db.IUser} user - The databse user profile object of the corresponding user
     * @returns {discord.MessageEmbed} - The embed of the profile
     */
    const avatarURL = message.author.avatarURL({size: 128})
    const guildMember = await message.guild?.members.fetch(message.author.id);
    const level = getLevel(user.xp);
    const xpNextLevel = levelXP(level + 1);
    const profileEmbed = new discord.MessageEmbed()
    .setColor(user.color)
    .setAuthor(message.author.username, (avatarURL == undefined) ? message.author.defaultAvatarURL : avatarURL)
    .setThumbnail((avatarURL == undefined) ? message.author.defaultAvatarURL : avatarURL)
    .addField("Rank", guildMember?.roles.highest.name)
    .addField("Level", `:diamond_shape_with_a_dot_inside: ${level}`, true)
    .addField("Balance", `:dollar: ${user.balance}`, true)
    .addField("Total XP", `:sparkles: ${user.xp}`, true)
    .addField("Progress", `${":white_large_square:".repeat(Math.round(user.xp / xpNextLevel))}${":black_large_square:".repeat(10 - Math.round(user.xp / xpNextLevel))}`, true)
    .addField("Reputation", `:sunglasses: ${(user.rep > 0) ? "+" : ""}${user.rep}`)
    .setFooter("Social")
    .setTimestamp();

    return profileEmbed;
}

export async function updateRep(selfUser: discord.User, targetUser: discord.User): Promise<void> {
    /**
     * Award a user a reputation point
     * 
     * @param {discord.User} selfUser - The Discord user awarding the reputation point
     * @param {discord.User} targetUser - The Discord user receiving the repuation point
     */
    const target: db.IUser = await db.fetchUser(targetUser.id);
    await db.updateUser(targetUser.id, "rep", target.rep + 1);
    await db.updateUser(selfUser.id, "lastRep", Date.now());
}

export async function updateUnrep(selfUser: discord.User, targetUser: discord.User) {
    /**
     * Removes reputation point from a user
     * 
     * @param {discord.User} selfUser - The Discord user removing the reputation point
     * @param {discord.User} targetUser - The Discord user whose repuation point is being removed
     */
    const target: db.IUser = await db.fetchUser(targetUser.id);
    await db.updateUser(targetUser.id, "rep", target.rep - 1);
    await db.updateUser(selfUser.id, "lastRep", Date.now());
}