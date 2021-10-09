import Nebula from './core/nebula';
import { token, guildId, clientId } from './config.json';

async function main() {
	const nebula = new Nebula(token, clientId, guildId);
	
	await nebula.registerCommands()
	await nebula.login()
	
	nebula.start()
}

main();