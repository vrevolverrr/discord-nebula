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
         * Creates an embed as a response
         * 
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
        /**
         * Creates an embed for permission error response
         * 
         * @param {discord.Message} message - The Discord message object
         * @param {string} commandName - The name of the command
         * @param {string} commandCategory - The category of the command
         * @returns {discord.MessageEmbed} - The embed for the response
         */
        return this.createResponse(
            message,
            commandName,
            commandCategory,
            this.embedColor,
            `You do not have sufficient permissions to do that`
        );
    }

    createUsageResponse(message: discord.Message, commandName: string, commandCategory: string, usage: string): discord.MessageEmbed {
        /**
         * Creates an embed for usage response
         * 
         * @param {discord.Message} message - The Discord message object
         * @param {string} commandName - The name of the command
         * @param {string} commandCategory - The category of the command
         * @param {string} usage - The usage of the command
         * @returns {discord.MessageEmbed} - The embed for the response
         */
        return this.createResponse(
            message,
            commandName,
            commandCategory,
            this.embedColor,
            "Usage: `" + usage + "`"
        );
    }

    async aboveRole(message: discord.Message, roleID: string): Promise<boolean> {
        /**
         * Compares the highest role of a user with a given role in the server
         * 
         * @param {discord.Message} message - The Discord message object
         * @param {string} roleID - The ID of the role to compare with
         * @returns {Promise<boolean>} - A promise which resolves to true or false
         */
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
        levels.XPManager.startVoiceXPMonitor();
        levels.XPManager.startUpdateDatabaseXP();
    };

    onVoiceStateUpdate = (oldState: discord.VoiceState, newState: discord.VoiceState) => {
        const userID: string = oldState.id;

        if (newState.channelID && !newState.deaf && !newState.mute) {
            levels.XPManager.setUserActive(userID);
        } else {
            levels.XPManager.setUserInactive(userID);
        }
    };

    /** Discord Commands */
    /** Utils */
    help: GuildAction = new GuildAction({
        name: "help",
        description: "Show detailed usage information for a command",
        usage: "help <command>",
        action: (message: discord.Message, user: db.IUser) => {
            const createHelpMessage = (command: GuildAction) => this.createResponse(
                message,
                (typeof command.name == "string") ? `${this.prefix}${command.name}` : `${this.prefix}${command.name[0]}`,
                "Help",
                this.embedColor,
                command.description,
                {fields: [
                    {name: "Aliases", value: (typeof command.name == "string") ? command.name : command.name.join(", ")},
                    {name: "Usage", value: "`" + command.usage + "`"}
                ]}
            );
            const createMessage = (msg: string) => this.createResponse(
                message,
                "Help",
                "Utils",
                this.embedColor,
                msg
            );
            const args: string[] = this.parseArguments(message);
            const command: any = (this as any)[args[0]];

            if (command == undefined) {
                message.channel.send(createMessage("❌ Command not found"));
                return;
            };
            message.channel.send(createHelpMessage(command));
        }
    });

    ping: GuildAction = new GuildAction({
        name: "ping",
        description: "Check the websocket latency of the bot",
        usage: "ping",
        action: async (message: discord.Message, user: db.IUser) => {
            const response: discord.MessageEmbed = this.createResponse(
                message,
                "Ping",
                "Utils",
                this.embedColor,
                "✅ Websocket latency is `" + this.client.ws.ping.toString() + "ms`",
            );
            message.channel.send(response);
        }
    });

    clear: GuildAction = new GuildAction({
        name: "clear",
        description: "Delete messages in bulk",
        usage: "clear <number>",
        action: async (message: discord.Message, user: db.IUser) => {
            const usage = this.createUsageResponse(
                message,
                "Clear Messages",
                "Utils",
                "clear <number>"
            );

            const createMessage = (msg: string) => this.createResponse(
                message,
                "Clear Messages",
                "Utils",
                this.embedColor,
                msg
            )

            if (!this.aboveRole(message, "324094340135911424")) {
                message.channel.send(this.createPermErrorResponse(message, "Clear Messages", "Utils"));
                return;
            }
            const arg: string = this.parseArguments(message).join(" ");
            const channel: discord.TextChannel = message.channel as discord.TextChannel;
            const numMessages: number = parseInt(arg);

            if (Number.isNaN(numMessages)) {
                message.channel.send(usage);
                return;
            }

            if (numMessages < 1 || numMessages > 99) {
                message.channel.send(createMessage("❌ Please specify a number in between 1 and 99"));
                return;
            }
            
            await channel.bulkDelete(numMessages + 1, true);
            channel.send("✅ Succesfully cleared `" + numMessages + " messages`").then(msg => {
                msg.delete({timeout: 1500});
            });
        }
    });

    /** Social */
    profile: GuildAction = new GuildAction({
        name: ["profile", "pf"],
        description: "Show your user profile or customise your profile",
        usage: "profile or profile <setting> <value>",
        action: async (message: discord.Message, user: db.IUser) => {
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
        }
    });

    rep: GuildAction = new GuildAction({
        name: "rep",
        description: "Award a user a reputation point",
        usage: "rep <@user>",
        action: async (message: discord.Message, user: db.IUser) => {
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
        }
    });

    unrep: GuildAction = new GuildAction({
        name: "unrep",
        description: "Remove a reputation point from a user",
        usage: "unrep <@user>",
        action: async (message: discord.Message, user: db.IUser) => {
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
        }
    });

    match: GuildAction = new GuildAction({
        name: "match",
        description: "Check the compatability between two users",
        usage: "match <@user1> <@user2>",
        action: async (message: discord.Message, user: db.IUser) => {
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
        }
    });

    /** Economy */
    transfer: GuildAction = new GuildAction({
        name: ["transfer", "tf"],
        description: "Transfer funds to a user",
        usage: "transfer <@user> <amount> or tf <@user> <amount>",
        action: async (message: discord.Message, user: db.IUser) => {
            const usage = this.createUsageResponse(
                message,
                "Transfer",
                "Economy",
                "transfer <@user> <amount>"
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
        }
    });

    /** Gambling */
    gamblingThumbnail = "https://i.imgur.com/BvnksIe.png";

    coinflip: GuildAction = new GuildAction({
        name: ["coinflip", "cf"],
        description: "Play a game of coinflip",
        usage: "coinflip <heads/tails> <amount> or cf <h/t> <amount>",
        action: async (message: discord.Message, user: db.IUser) => {
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
        }
    });
}