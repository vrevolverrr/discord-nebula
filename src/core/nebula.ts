import { readdirSync } from 'fs';
import { Client, CommandInteraction, Intents } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { commandsMeta } from './command';
import { SlashCommandBuilder } from '@discordjs/builders';
import * as logger from '../core/logger';

export default class Nebula {
    token: string;
    clientId: string;
    guildId: string;
    client: Client;

    constructor(token: string, clientId: string, guildId: string) {
        this.token = token;
        this.clientId = clientId;
        this.guildId = guildId;
        this.client = new Client({intents: [Intents.FLAGS.GUILDS]});
    }

    async login(): Promise<void> {
        /**
         * Logs the client in, establishing a websocket connection to Discord.
         */
        await this.client.login(this.token);
        logger.info("Succesfully logged in");
    }

    start(): void {
        /**
         * Create Discord events for the bot to listen to
         */
        logger.info("Ready! Listening to events");

        this.client.on('interactionCreate', async (interaction: CommandInteraction) => {
            if (!interaction.isCommand()) return;
            commandsMeta[interaction.commandName]["main"](interaction, this.client)
        });
    }

    async loadCommands(): Promise<Object> {
        /**
         * Dynamically imports the commands to push them to the commandsMeta object
         */
        logger.info("Dynamically importing commands");

        return new Promise((resolve, _) => {
            readdirSync("./build/commands/").forEach(async file => {
                const path = `../commands/${file}`;
                const module = await import(path);
                module.default()
            });
            resolve(commandsMeta);
        })
    }

    async registerCommands(): Promise<void> {
        /**
         * Posts slash commands to Discord API
         */
        logger.info("Registering slash commands");

        const commandsMeta = await this.loadCommands();
        const commands = [];

        for (let [key, value] of Object.entries(commandsMeta)) {
            logger.info(`Parsing slash command : ${key}`)
            commands.push((value["command"] as SlashCommandBuilder).toJSON())
        }
        
        const rest = new REST({ version: '9' }).setToken(this.token);
        
        await rest.put(Routes.applicationGuildCommands(this.clientId, this.guildId), { body: commands })
            .then(() => logger.info("Successfully registered slash commands"))
            .catch(logger.error);
    }
}