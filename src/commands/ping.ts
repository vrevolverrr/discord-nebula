import { Client, CommandInteraction } from "discord.js";
import { useArgument, useCommand } from "../core/command";

function ping(interaction: CommandInteraction, client: Client) {
	interaction.reply(`⏳ Websocket ping is ${client.ws.ping}ms`);
}

export default () => {
	useCommand(ping, "Shows the latency of Nebula bot");
	useArgument(ping, "test", "string", "Test argument", true);
	useArgument(ping, "test2", "number", "Test argument 2");
}