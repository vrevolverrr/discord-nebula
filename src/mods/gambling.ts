import * as discord from 'discord.js';
import * as db from '../core/database';

export async function rockPaperScissors(user: discord.User, userProfile: db.IUser, betDirection: number, betAmount: number): Promise<Array<string>> {
    const rollValue: number = Math.random();
    var rollDirectionValue: number;
    
    switch (true) {
        case (rollValue >= 2/3):
            rollDirectionValue = 2;
            break;
        case (rollValue >= 1/3):
            rollDirectionValue = 1;
            break;
        case (rollValue >= 0):
            rollDirectionValue = 0;
            break;
        default:
            rollDirectionValue = 0;
            break;
    }
    var rollDirection: string;
    switch(rollDirectionValue) {
        case 0:
            rollDirection = "rock";
            break;
        case 1:
            rollDirection = "paper";
            break;
        case 2:
            rollDirection = "scissors";
            break;
        default:
            rollDirection = "rock"
    }
    var profit: number;
    switch (true) {
        case (betDirection == 0 && rollDirectionValue == 2):
            profit = betAmount;
            break;
        case (betDirection == 1 && rollDirectionValue == 0):
            profit = betAmount;
            break;
        case (betDirection == 2 && rollDirectionValue == 1):
            profit = betAmount;
            break;
        case (betDirection == rollDirectionValue):
            profit = 0;
            break
        default:
            profit = -betAmount;
    }
    var outcome: string;
    switch (true) {
        case (profit == 0):
            outcome = "tied";
            break;
        case (profit > 0):
            outcome = "won";
            break;
        case (profit < 0):
            outcome = "lost";
            break;
        default:
            outcome = "tied";
            break;
    }
    await db.updateUser(user.id, "balance", userProfile.balance + profit);
    return [rollDirection, outcome, Math.abs(profit).toString(), (userProfile.balance + profit).toString()]
}

export function getRockPaperScissorsBet(betDirection: string): number | undefined {
    switch (betDirection.toLowerCase()) {
        case "rocks":
            return 0;
        case "rock":
            return 0;
        case "r":
            return 0;
        case "papers":
            return 0;
        case "paper":
            return 1;
        case "p":
            return 1;
        case "scissors":
            return 2;
        case "scissor":
            return 2;
        case "s":
            return 2;
        default:
            return undefined;
    }
}

export async function coinflip(user: discord.User, userProfile: db.IUser, betDirection: boolean, betAmount: number): Promise<Array<string>> {
    /**
     * The coinflip gambling game
     * 
     * @param {discord.User} user - The Discord user playing the game
     * @param {db.IUser} userProfile - The database user profile object of the user
     * @param {boolean} betDirection - The side of coin to bet on. True for heads and False for tails
     * @param {number} betAmount - The amount of money to bet with
     * @returns {Array<string>} - The rolled direction (heads / tails), outcome (win / lose), profit ( = betAmount) and the balance
     */
    const rollDirectionBool: boolean = Math.random() > 0.5;
    const profit = (betDirection == rollDirectionBool) ? betAmount : -betAmount
    const rollDirection: string = (rollDirectionBool) ? "heads" : "tails";
    const outcome: string = (profit > 0) ? "won" : "lost";

    await db.updateUser(user.id, "balance", userProfile.balance + profit);

    return [rollDirection, outcome, Math.abs(profit).toString(), (userProfile.balance + profit).toString()]
}

export function getCoinflipBet(betDirection: string): boolean | undefined {
    /**
     * Returns coinflip bet as true or false states
     * 
     * @param {string} betDirection - The side of coin to bet on
     * @returns {boolean | undefined} - True for heads, false for tails, undefined for unknown bet
     */
    switch(betDirection.toLowerCase()) {
        case "heads":
            return true;
        case "head":
            return true;
        case "h":
            return true;
        case "tails":
            return false;
        case "tail":
            return false;
        case "t":
            return false;
        default:
            return undefined;
    }
}