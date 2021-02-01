import * as discord from 'discord.js';
import * as lib from '../core/lib';
import * as db from '../core/database';
import { EmbedField } from '../core/bot';
import { getLevel, levelXP } from '../mods/levels';
import { IUser } from '../core/database';

export function match(user1: discord.User, user2: discord.User): EmbedField[] {
    var conclusion: string = "";
    var resultValue: number = (lib.hash(user1.username) + lib.hash(user2.username)) % 101;

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

export async function createProfileEmbed(message: discord.Message, user: IUser): Promise<discord.MessageEmbed> {
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

export async function updateRep(selfUser: discord.User, targetUser: discord.User) {
    const target: IUser = await db.fetchUser(targetUser.id);
    await db.updateUser(targetUser.id, "rep", target.rep + 1);
    await db.updateUser(selfUser.id, "lastRep", Date.now());
}

export async function updateUnrep(selfUser: discord.User, targetUser: discord.User) {
    const target: IUser = await db.fetchUser(targetUser.id);
    await db.updateUser(targetUser.id, "rep", target.rep - 1);
    await db.updateUser(selfUser.id, "lastRep", Date.now());
}