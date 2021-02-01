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
        const usage = this.createUsageResponse(
            message,
            "Profile",
            "Social",
            "profile or profile <setting> <value>"
        );
        const colorUsage = 
            this.createUsageResponse(
                message,
                "Profile",
                "Social",
                "profile color <hexValue>"
            );

        const args: string[] = this.parseArguments(message);

        const showUserProfile = async () => {
            const profileEmbed = await social.createProfileEmbed(message, user);
            message.channel.send(profileEmbed);
        }

        // Set profile functions
        const setProfileColor = async (color: string) => {
            if (!lib.validateColor(color)) {
                message.channel.send(colorUsage);
                return;
            }
            await db.updateUser(message.author.id, "color", `'${color}'`);
            await message.channel.send("✅ Succesfully updated profile color");
        }

        const setProfileSettings = async (property: string, option: string) => {
            switch(property) {
                case "color":
                    await setProfileColor(option);
                    break;
                default:
                    message.channel.send(usage);
            }
        }

        switch(args.length) {
            case 0:
                showUserProfile();
                break;
            case 2:
                setProfileSettings(args[0], args[1]);
                break;
            default:
                message.channel.send(usage);
                break
        }
    });

    rep: GuildAction = new GuildAction("rep", async (message: discord.Message, user: db.IUser) => {
        const usage = this.createUsageResponse(
            message,
            "Reputation",
            "Social",
            "rep <@user>"
        );
        const createMessage = (msg: string) =>
            this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                msg
            );

        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];

        if (mentions.length == 0) {
            message.channel.send(usage);
            return;
        }

        if (lib.isToday(user.lastRep) && message.author.id !== "309642430532157440") {
            message.channel.send(createMessage("❌ You have already done that today"));
            return;
        }

        if (message.author.id == mentions[0].user.id) { 
            message.channel.send(createMessage("❌ You cannot unrep yourself"));
            return;
        }

        await social.updateRep(message.author, mentions[0].user);
        message.channel.send(createMessage(`✅ Gave ${mentions[0].user.username} a reputation point`));
    });

    unrep: GuildAction = new GuildAction("unrep", async (message: discord.Message, user: db.IUser) => {
        const usage = this.createUsageResponse(
            message,
            "Reputation",
            "Social",
            "unrep <@user>"
        );
        const createMessage = (msg: string) =>
            this.createResponse(
                message,
                "Reputation",
                "Social",
                this.embedColor,
                msg
            );

        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];
        if (mentions.length == 0) {
            message.channel.send(usage);
            return;
        }
        if (lib.isToday(user.lastRep) && message.author.id !== "309642430532157440") {
            message.channel.send(createMessage("❌ You have already done that today"));
            return;
        }
        if (message.author.id == mentions[0].user.id) {
            message.channel.send(createMessage("❌ You cannot unrep yourself"));
            return;
        }
        await social.updateUnrep(message.author, mentions[0].user);
        message.channel.send(createMessage(`✅ Removed a reputation point from ${mentions[0].user.username}`));
    });

    match: GuildAction = new GuildAction("match", async (message: discord.Message, user: db.IUser) => {
        const usage = this.createUsageResponse(
            message,
            "Matchmaking",
            "Social",
            "match <@user1> <@user2>"
        );
    
        const users: discord.User[] = message.mentions.users.array();
        if (users.length == 0 || users.length > 2) {
            message.channel.send(usage);
            return;
        }
        const user1: discord.User = users[0];
        const user2: discord.User = (users.length == 2) ? users[1] : message.author
        const result: EmbedField[] = social.match(user1, user2);

        const response: discord.MessageEmbed = this.createResponse(
            message,
            "Matchmaking",
            "Social",
            this.embedColor,
            "Here's what I think about this ship",
            {useThumbnail: true, fields: result}
        );
        message.channel.send(response);
    });

    /** Economy */
    transfer: GuildAction = new GuildAction(["transfer", "tf"], async (message: discord.Message, user: db.IUser) => {
        const usage = this.createUsageResponse(
            message,
            "Transfer",
            "Economy",
            "transfer <@target> <amount>"
        );
        const createMessage = (msg: string) =>
            this.createResponse(
                message,
                "Transfer",
                "Economy",
                this.embedColor,
                msg
            );

        const args: string[] = this.parseArguments(message);
        const mentions: discord.GuildMember[] = message.mentions.members?.array() as discord.GuildMember[];

        if (mentions.length == 0 || args.length != 2) {
            message.channel.send(usage);
            return;
        }
        const amount: number | undefined = economy.parseCurrencyAmount(user, args[1]);
        const target: discord.GuildMember = mentions[0];
        if (amount == undefined) {
            message.channel.send(usage);
            return;
        }
        if (user.balance < amount && message.author.id !== "309642430532157440") {
            message.channel.send(createMessage("❌ You have insufficient funds"));
            return;
        }
        await economy.transfer(message.author, user, target.user, amount);
        message.channel.send(createMessage("✅ Succesfully transferred funds"));
    });

    /** Gambling */
    gamblingThumbnail = "https://i.imgur.com/BvnksIe.png";

    coinflip: GuildAction = new GuildAction(["coinflip", "cf"], async (message: discord.Message, user: db.IUser) => {
        const usage = this.createUsageResponse(
            message,
            "Coinflip",
            "Gambling", 
            "coinflip <heads/tails> <amount> or cf <h/t> <amount>"
        );
        const createMessage = (msg: string) => 
            this.createResponse(
                message,
                "Coinflip",
                "Gambling",
                this.embedColor,
                msg,
                {customThumbnail: this.gamblingThumbnail}
            );

        const args: string[] = this.parseArguments(message);
        const betDirection: boolean | undefined = gambling.getCoinflipBet(args[0]);
        const betAmount: number | undefined = economy.parseCurrencyAmount(user, args[1]);

        // Checks whether bet direction is valid
        if (betDirection == undefined) {
            message.channel.send(usage);
            return;
        }
        // Check whether bet amount is valid
        if (betAmount == undefined) {
            message.channel.send(createMessage("❌ Invalid bet"));
            return;
        }
        // Checks whether user can afford the bet
        if (user.balance < betAmount) {
            message.channel.send(createMessage(`❌ You have insufficient balance of :dollar: ${user.balance}`));
            return;
        }
        // Checks whether bet is not zero
        if (betAmount == 0) {
            message.channel.send(createMessage("❌ Invalid bet"));
            return;
        }
        const [rollDirection, outcome, profit, newBalance] = await gambling.coinflip(message.author, user, betDirection, betAmount);
        message.channel.send(createMessage(`Outcome was **${rollDirection}**\nYou've ${outcome} ${profit}\nYour balance now is :dollar: ${newBalance}`));
    });
}