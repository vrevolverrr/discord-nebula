import { SlashCommandBuilder, } from "@discordjs/builders";
import { Client, CommandInteraction } from "discord.js";

export const commandsMeta = {};

interface CommandFunction {
    (interaction: CommandInteraction, client: Client): void;
}

interface Choice {
    choice: string
    value: any
}

export function useCommand(commandFunction: CommandFunction, description: string) {
    const commandName = commandFunction.name;
    commandsMeta[commandName] = {
        description: description,
        command: new SlashCommandBuilder().setName(commandName).setDescription(description),
        argument: [],
        main: (interaction: CommandInteraction, client: Client) => commandFunction(interaction, client)
    }
}

export function useArgument(commandFunction: CommandFunction, name: string, type: string, 
        description: string, required: boolean = false, choices: Choice[] = []) {
    
    const commandName = commandFunction.name;

    const argument = {
        name: name,
        type: type,
        description: description,
        choices: choices
    }

    commandsMeta[commandName]["argument"].push(argument);
    
    const command = commandsMeta[commandName]["command"] as SlashCommandBuilder;

    switch(type) {
        case "string":
            command.addStringOption(option => {
                const builder = option.setName(name).setDescription(description).setRequired(required);
                choices.forEach(choice => builder.addChoice(choice.choice, choice.value));
                return builder;
            });
            break;
        case "boolean":
            command.addBooleanOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        case "channel":
            command.addChannelOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        case "integer":
            command.addIntegerOption(option => {
                const builder = option.setName(name).setDescription(description).setRequired(required);
                choices.forEach(choice => builder.addChoice(choice.choice, choice.value));
                return builder;
            });
            break;
        case "number":
            command.addNumberOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        case "mention":
            command.addMentionableOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        case "role":
            command.addRoleOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        case "user":
            command.addRoleOption(option => option.setName(name).setDescription(description).setRequired(required));
            break;
        default:
            throw Error(`Type ${type} is a a valid type for options`)
    }
}
