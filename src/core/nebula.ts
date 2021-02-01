import * as discord from 'discord.js';
import { DiscordBot, IDiscordEvents, GuildAction, UserAction, EmbedField } from './bot';
import * as db from './database';
import * as lib from './lib';
import * as logger from './logger';
import * as economy from '../mods/economy';
import * as gambling from '../mods/gambling';
import * as levels from '../mods/levels';
import * as social from '../mods/social';

export default class NebulaBot extends DiscordBot implements IDiscordEvents {
    embedColor: string = "#0099ff";

    constructor(token: string) {
        super(token);
        this.registerEventListeners();
        this.registerCommands();
    }

    /** Helper Methods */
    createResponse(message: discord.Message, commandName: string, commandCategory: string, color: string,
        commandResponse: string, options: {useThumbnail?: boolean, customThumbnail?: string, fields?: EmbedField[], imageURL?: string} = {}) {
        /**
         * @param {discord.Message} message - Discord message object passed to the onMessage event.
         * @param {string} commandName - Name of the command called.
         * @param {string} commandCategory - Category of command called
         * @param {string} color - Colour code for the embed.
         * @param {IEmbedField} fields - Additional embed fields.
         * @param {string?} imageURL - URL of embed image (optional).
         *
         * @returns {discord.MessageEmbed} - Generated response embed
         */
        const avatarURL = message.author.avatarURL({size: 128});
        const thumbnailURL = this.client.user?.avatarURL({size: 128});
        const thumbnailFallbackURL = message.author.defaultAvatarURL;
        const embed = new discord.MessageEmbed()
        .setColor(color)
        .setAuthor(message.author.username, (avatarURL == undefined) ? message.author.defaultAvatarURL : avatarURL)
        .addField(commandName, commandResponse)
        .setFooter(commandCategory)
        .setTimestamp();

        if (options.useThumbnail) embed.setThumbnail((thumbnailURL == undefined) ? thumbnailFallbackURL : thumbnailURL);
        if (options.customThumbnail) embed.setThumbnail(options.customThumbnail);
        if (options.fields !== undefined) embed.addFields(options.fields);
        if (options.imageURL !== undefined) embed.setImage(options.imageURL);

        return embed;
    }

    createPermErrorResponse(message: discord.Message, commandName: string, commandCategory: string): discord.MessageEmbed {
        const response: discord.MessageEmbed = this.createResponse(
            message,
            commandName,
            commandCategory,
            this.embedColor,
            `You do not have sufficient permissions to do that`
        );
        return response;
    }

    createUsageResponse(message: discord.Message, commandName: string, commandCategory :string, usage: string) {
        const response: discord.MessageEmbed = this.createResponse(
            message,
            commandName,
            commandCategory,
            this.embedColor,
            "Usage: `" + usage + "`"
        );
        return response;
    }

    async aboveRole(message: discord.Message, roleID: string) {
        const guildMember = await message.guild?.members.fetch(message.author) as discord.GuildMember;

        return new Promise((resolve, reject) => {
            guildMember.guild.roles.fetch(roleID).catch(err => {
                logger.error(`Unable to fetch role for ID ${roleID} | ${err}`)
            }).then(role => {
                if (!(role instanceof discord.Role)) reject("Unable to fetch role")
                resolve(guildMember.roles.highest.comparePositionTo(role as discord.Role) > 0);
            });
        });
    }

    /** Discord Events */
    onReady = () => {
        levels.startVoiceXPMonitor();
        levels.startUpdateDatabaseXP();
    };

    onVoiceStateUpdate = (oldState: discord.VoiceState, newState: discord.VoiceState) => {
        const userID: string = oldState.id;

        if (newState.channelID && !newState.deaf && !newState.mute) {
            levels.setUserActive(userID);
        } else {
            levels.setUserInactive(userID);
        }
    };

    /** Discord Commands */
    /** Utils */
    ping: GuildAction = new GuildAction("ping", async (message: discord.Message, user: db.IUser) => {
        const response: discord.MessageEmbed = this.createResponse(
            message,
            "Ping",
            "Utils",
            this.embedColor,
            "✅ Websocket latency is `" + this.client.ws.ping.toString() + "ms`",
        );

        message.channel.send(response);
    });

    clear: GuildAction = new GuildAction("clear", async (message: discord.Message, user: db.IUser) => {
        if (!(this.aboveRole(message, "324094340135911424"))) {
            message.channel.send(this.createPermErrorResponse(message, "Clear Messages", "Utils"));
            return;
        }

        const arg: string = this.parseArguments(message).join(" ");
        const channel: discord.TextChannel = message.channel as discord.TextChannel;
        
        const numMessages: number = parseInt(arg);
        
        if (Number.isNaN(numMessages)) {
            message.channel.send(this.createUsageResponse(message, "Clear Messages", "Utils", "clear <number>"));
            return;
        } else {
            await channel.bulkDelete(numMessages + 1);
            channel.send("✅ Succesfully cleared `" + numMessages + " messages`").then(msg => {
                msg.delete({timeout: 1500});
            });
        }
    });

    test: GuildAction = new GuildAction("test", async (message: discord.Message) => {
        console.log(message.mentions.members?.array())
    });

    /** Social */
    profile: GuildAction = new GuildAction("profile", async (message: discord.Message, user: db.IUser) => {
        const args: string[] = this.parseArguments(message);

        if (args.length == 0) {
            const profileEmbed = await social.createProfileEmbed(message, user);
            message.channel.send(profileEmbed);

        } else if (args.length == 2) {
            if (args[0] == "color") {
                const color: string = args[1];
                if (!(lib.validateColor(color))) {
                    const embed: discord.MessageEmbed = this.createUsageResponse(
                        message,
                        "Profile",
                        "Social",
                        "profile color <hexValue>"
                    )
        
                    message.channel.send(embed);
                    return;
                }

                await db.updateUser(message.author.id, "color", `'${color}'`);
                await message.channel.send("✅ Succesfully updated profile color");

            } else {
                const embed: discord.MessageEmbed = this.createUsageResponse(
                    message,
                    "Profile",
                    "Social",
                    "profile or profile <setting> <value>"
                )
    
                message.channel.send(embed);
                return;
            }

        } else {
            const embed: discord.MessageEmbed = this.createUsageResponse(
                message,
                "Profile",
                "Social",
                "profile or profile <setting> <value>"
            )

            message.channel.send(embed);
            return;
        }
    });

    rep: GuildAction = new GuildAction("rep", async (message: discord.Message, user: db.IUser) => {
        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];

        if (mentions.length == 0) {
            const embed: discord.MessageEmbed = this.createUsageResponse(
                message,
                "Reputation",
                "Social",
                "rep <@user>"
            )

            message.channel.send(embed);
            return;
        }

        if ((new Date(user.lastRep)).getDay() == (new Date(Date.now()).getDay()) && message.author.id !== "309642430532157440") {
            const embed: discord.MessageEmbed = this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                "❌ You have already done that today"
            );
    
            message.channel.send(embed);
            return;
        }

        
        if (message.author.id == mentions[0].user.id) {
            const embed: discord.MessageEmbed = this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                "❌ You cannot unrep yourself"
            );
    
            message.channel.send(embed);
            return;
        }

        await social.updateRep(message.author, mentions[0].user);

        const embed: discord.MessageEmbed = this.createResponse(
            message,
            "Reputation",
            "Social",
            this.embedColor,
            `✅ Gave ${mentions[0].user.username} a reputation point`
        );

        message.channel.send(embed);
    });

    unrep: GuildAction = new GuildAction("unrep", async (message: discord.Message, user: db.IUser) => {
        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];

        if (mentions.length == 0) {
            const embed: discord.MessageEmbed = this.createUsageResponse(
                message,
                "Reputation",
                "Social",
                "unrep <@user>"
            )

            message.channel.send(embed);
            return;
        }

        if ((new Date(user.lastRep)).getDay() == (new Date(Date.now()).getDay()) && message.author.id !== "309642430532157440") {
            const embed: discord.MessageEmbed = this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                "❌ You have already done that today"
            );
    
            message.channel.send(embed);
            return;
        }

        if (message.author.id == mentions[0].user.id) {
            const embed: discord.MessageEmbed = this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                "❌ You cannot unrep yourself"
            );
    
            message.channel.send(embed);
            return;
        }

        await social.updateUnrep(message.author, mentions[0].user);

        const embed: discord.MessageEmbed = this.createResponse(
            message,
            "Reputation",
            "Social",
            this.embedColor,
            `✅ Removed a reputation point from ${mentions[0].user.username}`
        );

        message.channel.send(embed);
    });

    match: GuildAction = new GuildAction("match", async (message: discord.Message, user: db.IUser) => {
        const users: discord.User[] = message.mentions.users.array();

        if (users.length == 0 || users.length > 2) {
            message.channel.send(this.createUsageResponse(message, "Matchmaking", "Social", "match <@user1> <@user2>"));
            return;
        }

        const user1: discord.User = users[0];
        const user2: discord.User = (users.length == 2) ? users[1] : message.author
        
        const fields = social.match(user1, user2);

        const response: discord.MessageEmbed = this.createResponse(
            message,
            "Matchmaking",
            "Social",
            this.embedColor,
            "Here's what I think about this ship",
            {useThumbnail: true, fields: fields}
        );
        message.channel.send(response);
    });

    /** Economy */
    transfer: GuildAction = new GuildAction(["transfer", "tf"], async (message: discord.Message, user: db.IUser) => {
        const args: string[] = this.parseArguments(message);
        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];
        
        if (mentions.length == 0 || args.length != 2) {
            const embed: discord.MessageEmbed = this.createUsageResponse(
                message,
                "Transfer",
                "Economy",
                "transfer <@target> <amount>"
            )

            message.channel.send(embed);
            return;
        }

        const amount = parseInt(args[1]);
        const target: discord.GuildMember = mentions[0];

        if (Number.isNaN(amount)) {
            const embed: discord.MessageEmbed = this.createUsageResponse(
                message,
                "Transfer",
                "Economy",
                "transfer <@target> <amount>"
            )

            message.channel.send(embed);
            return;
        }

        if (user.balance < amount && message.author.id !== "309642430532157440") {
            const embed: discord.MessageEmbed = this.createResponse(
                message,
                "Transfer",
                "Economy",
                this.embedColor,
                "❌ You have insufficient funds"
            );
    
            message.channel.send(embed);
            return;
        }

        await economy.transfer(message.author, user, target.user, amount);

        const embed: discord.MessageEmbed = this.createResponse(
            message,
            "Donate",
            "Economy",
            this.embedColor,
            "✅ Succesfully transferred funds"
        );

        message.channel.send(embed);
    });

    /** Gambling */
    gamblingThumbnail = "https://i.imgur.com/BvnksIe.png";

    coinflip: GuildAction = new GuildAction(["coinflip", "cf"], async (message: discord.Message, user: db.IUser) => {
        const args: string[] = this.parseArguments(message);
        var betAmount = parseInt(args[1]);
        var betDirection: boolean;

        if (Number.isNaN(betAmount) && (args[1] == "a" || args[1] == "all")) {
            betAmount = user.balance;
        }

        if ((args[0] == "heads" || args[0] == "h") && !(Number.isNaN(betAmount))) betDirection = true;
        else if (args[0] == "tails" || args[0] == "t" && !(Number.isNaN(betAmount))) betDirection = false;
        else {
            const response: discord.MessageEmbed = this.createUsageResponse(
                message, "Coinflip", "Gambling", "coinflip <heads/tails> <amount> or cf <h/t> <amount>");
            message.channel.send(response);
            return;
        }

        if (betAmount == 0) {
            const response: discord.MessageEmbed = this.createResponse(
                message,
                "Coinflip",
                "Gambling",
                this.embedColor,
                `❌ Invalid bet`,
                {customThumbnail: this.gamblingThumbnail}
            );
            message.channel.send(response);
            return;
        }
        
        if (user.balance < betAmount) {
            const response: discord.MessageEmbed = this.createResponse(
                message,
                "Coinflip",
                "Gambling",
                this.embedColor,
                `❌ You have insufficient balance of :dollar: ${user.balance}`,
                {customThumbnail: this.gamblingThumbnail}
            );
            message.channel.send(response);
            return;
        }

        const [rollDirection, outcome, profit, newBalance] = await gambling.coinflip(message.author, user, betDirection, betAmount);
        
        const response: discord.MessageEmbed = this.createResponse(
            message,
            "Coinflip",
            "Gambling",
            this.embedColor,
            `Outcome was **${rollDirection}**\nYou've ${outcome} ${profit}\nYour balance now is :dollar: ${newBalance}`,
            {customThumbnail: this.gamblingThumbnail}
        );
        message.channel.send(response);
    });
}