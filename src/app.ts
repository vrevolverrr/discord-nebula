import { spawn } from 'child_process';
import Nebula from './core/nebula';

async function main() {
    const token: string | undefined = process.env.NEBULA_BOT_TOKEN;
    if (token == undefined) throw Error("Nebula bot token not found in environment variables")
    const nebula = new Nebula(process.env.NEBULA_BOT_TOKEN as string);
    nebula.start();
}

main();