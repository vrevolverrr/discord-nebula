import * as discord from 'discord.js';
import * as logger from './logger';
import * as db from './database';
import * as level from '../mods/levels';

export interface IDiscordEvents {
    onReady?(): void;
    onMessage(message: discord.Message): void;
    onWarn?(): void;
    onDebug?(info: string): void;
    onInvalidated?(): void;
    onChannelCreate?(channel: discord.Channel): void;
    onChannelDelete?(channel: discord.Channel): void;
    onChannelPinsUpdate?(channel: discord.Channel, time: Date): void;
    onChannelUpdate?(oldChannel: discord.Channel, newChannel: discord.Channel): void;
    onEmojiCreate?(emoji: discord.GuildEmoji): void;
    onEmojiDelete?(emoji: discord.GuildEmoji): void;
    onEmojiUpdate?(oldEmoji: discord.GuildEmoji, newEmoji: discord.GuildEmoji): void;
    onError?(error: Error): void;
    onGuildBanAdd?(guild: discord.Guild, user: discord.User): void;
    onGuildBanRemove?(guild: discord.Guild, user: discord.User): void;
    onGuildCreate?(guild: discord.Guild): void;
    onGuildDelete?(guild: discord.Guild): void;
    onGuildIntegrationsUpdate?(guild: discord.Guild): void;
    onGuildMemberAdd?(member: discord.GuildMember | discord.PartialGuildMember): void;
    onGuildMemberAvailable?(member: discord.GuildMember | discord.PartialGuildMember): void;
    onGuildMemberRemove?(member: discord.GuildMember | discord.PartialGuildMember): void;
    onGuildMembersChunk?(members: discord.Collection<string, discord.GuildMember>, guild: discord.Guild, chunk: {count: number, index: number, nonce: string | undefined}): void;
    onGuildMemberSpeaking?(member: discord.GuildMember | discord.PartialGuildMember, speaking: Readonly<discord.Speaking>): void;
    onGuildMemberUpdate?(oldMember: discord.GuildMember | discord.PartialGuildMember, newMember: discord.GuildMember | discord.PartialGuildMember): void;
    onGuildUnavailable?(guild: discord.Guild): void;
    onGuildUpdate?(oldGuild: discord.Guild, newGuild: discord.Guild): void;
    onInviteCreate?(invite: discord.Invite): void;
    onInviteDelete?(invite: discord.Invite): void;
    onMessageDelete?(message: discord.Message | discord.PartialMessage): void;
    onMessageDeleteBulk?(messages: discord.Collection<string, discord.Message | discord.PartialMessage>): void;
    onMessageReactionAdd?(messageReaction: discord.MessageReaction, user: discord.User | discord.PartialUser): void;
    onMessageReactionRemove?(messageReaction: discord.MessageReaction, user: discord.User | discord.PartialUser): void;
    onMessageReactionRemoveAll?(message: discord.Message | discord.PartialMessage): void;
    onMessageReactionRemoveEmoji?(messageReaction: discord.MessageReaction): void;
    onMessageUpdate?(oldMessage: discord.Message | discord.PartialMessage, newMessage: discord.Message | discord.PartialMessage): void;
    onPresenceUpdate?(oldPresence: discord.Presence | undefined, newPresence: discord.Presence | undefined): void;
    onRateLimit?(rateLimitInfo: {timeout: number, limit: number, method: string, path: string, route: string}): void;
    onRoleCreate?(role: discord.Role): void;
    onRoleDelete?(role: discord.Role): void;
    onRoleUpdate?(oldRole: discord.Role, newRole: discord.Role): void;
    onShardDisconnect?(event: discord.CloseEvent, id: number): void;
    onShardError?(error: Error, shardId: number): void;
    onShardReady?(id: number, unavailableGuilds: Set<String> | undefined): void;
    onShardReconnecting?(id: number): void;
    onShardResume?(id: number, replayedEvents: number): void;
    onTypingStart?(channel: discord.Channel, user: discord.User | discord.PartialUser): void 
    onUserUpdate?(oldUser: discord.User | discord.PartialUser, newUser: discord.User | discord.PartialUser): void 
    onVoiceStateUpdate?(oldState: discord.VoiceState, newState: discord.VoiceState): void 
    onWebhookUpdate?(channel: discord.TextChannel): void;
}

interface IUserAction {
    (message: discord.Message, user: db.IUser): void
}
interface IGuildAction {
    (message: discord.Message, user: db.IUser): void
}

export interface EmbedField {
    name: string
    value: string
    inline?: boolean
}

export class UserAction {
    name: string | string[]
    description: string;
    usage: string;
    action: Function;

    constructor(options: {name: string | string[], description: string, usage: string, action: IUserAction}) {
        this.name = options.name;
        this.description = options.description;
        this.usage = options.usage;
        this.action = options.action;
    }
}

export class GuildAction {
    name: string | string[];
    description: string;
    usage: string;
    action: Function;

    constructor(options: {name: string | string[], description: string, usage: string, action: IGuildAction}) {
        this.name = options.name;
        this.description = options.description;
        this.usage = options.usage;
        this.action = options.action;
    }
}

export class DiscordBot implements IDiscordEvents{
    token: string;
    protected guildCommands: Map<string, GuildAction>;
    protected userCommands: Map<string, UserAction>;
    protected client: discord.Client;
    protected prefix: string = ".";

    constructor(token: string) {
        this.token = token;
        this.client = new discord.Client();
        this.guildCommands = new Map<string, GuildAction>();
        this.userCommands = new Map<string, UserAction>();
    }

    private getClassMethods() {
        var ret: Set<string> = new Set();

        function methods(obj: any) {
            if (obj) {
                let properties: string[] = Object.getOwnPropertyNames(obj);
                properties.forEach(property => { if (obj[property] instanceof Function) ret.add(property) });
                methods(Object.getPrototypeOf(obj));
            }
        }
        methods(this.constructor.prototype);
        return Array.from(ret);
    }

    protected registerEventListeners() {
        /**
        * Registers event listners.
        *
        * @remarks
        * This method must be called by a subclass.
        *
        */
        const listeners: string[] = [];

        const parseEventName = (eventName: string) => eventName.substring(2).charAt(0).toLowerCase() + eventName.substring(2).slice(1)

        this.getClassMethods().filter(method => method.startsWith("on")).forEach(event => {
            const eventName = parseEventName(event);
            listeners.push(eventName);
            this.client.on(eventName, this.constructor.prototype[event]);
        });

        Object.keys(this).filter(property => property.startsWith("on")).forEach(event => {
            const eventName = parseEventName(event);
            listeners.push(eventName);
            this.client.on(parseEventName(event), (this as any)[event])
        })

        logger.info(`Registered ${listeners.length} event listener(s) | ${listeners.join(", ")}`)
    }

    protected registerCommands() {
        /**
        * Registers bot commands.
        *
        * @remarks
        * This method must be called by a subclass.
        *
        */
        const guildCommands: string[] = [];
        const userCommands: string[] = [];

        Object.getOwnPropertyNames(this).forEach(property => {
            const p = (this as any)[property];
            if (p instanceof GuildAction) {
                guildCommands.push(property);

                if (p.name instanceof Array) {
                    p.name.forEach(n => this.guildCommands.set(n, p));
                } else {
                    this.guildCommands.set(p.name, p)
                }
            } else if (p instanceof UserAction) {
                userCommands.push(property);
                
                if (p.name instanceof Array) {
                    p.name.forEach(n => this.userCommands.set(n, p));
                } else {
                    this.userCommands.set(p.name, p)
                }
            };
        });
        logger.info(`Registered ${guildCommands.length} guild command(s) | ${guildCommands.join(", ")}`);
        logger.info(`Registered ${userCommands.length} user command(s) | ${userCommands.join(", ")}`);
    }

    protected parseArguments(message: discord.Message): string[] {
        return message.content.split(" ").slice(1);
    }

    start() {
        this.client.login(this.token)
        .then(_ => logger.info("Succesfully logged in"))
        .catch(_ => logger.error("Unable to login. Invalid token"));
    }

    onMessage = (message: discord.Message): void => {
        if (message.guild) this.handleGuildMessage(message);
        else this.handleUserMessage(message);
    }

    private handleGuildMessage = async (message: discord.Message) => {
        if (message.author.bot) return;

        level.XPManager.increaseChatXP(message.author.id);

        if (!message.content.startsWith(this.prefix)) return;

        logger.info(`${message.author.username} issued guild command : ${message.content}`);
        const userID: string = message.author.id;
        const command: string = message.content.trimEnd().replace(this.prefix, "").split(" ")[0];
        const action: GuildAction | undefined = this.guildCommands.get(command);
        const user: db.IUser = await db.fetchUser(userID);
        if (action === undefined) return;
        
        action.action(message, user);
    }

    private handleUserMessage(message: discord.Message) {
        if (message.author.bot) return;
        if (!message.content.startsWith(this.prefix)) return;

        logger.info(`${message.author.username} issued user command : ${message.content}`);

        const command: string = message.content.trimEnd().replace(this.prefix, "").split(" ")[0];
        const action: UserAction | undefined = this.userCommands.get(command);
        if (action === undefined) return;

        action.action(message);
    }
}