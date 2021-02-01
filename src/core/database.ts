import { get } from 'http';

const dbHost: string = "127.0.0.1";
const port: number = 5000

export interface IUser {
    id: string
    xp: number
    rep: number
    balance: number
    color: string
    lastRep: number
}

export function addUser(userID: string): Promise<void> {
    return new Promise((resolve, reject) => {
        get({host: dbHost, port: port, path: "/addUser", headers: {"UserID": userID}}, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });

            resp.on('end', () => {
                resolve();
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}

export function updateUser(userID: string, column: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
        get({host: dbHost, port: port, path: "/updateUser", headers: {"UserID": userID, "Data": JSON.stringify({[column]: value})}}, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });

            resp.on('end', () => {
                resolve();
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}

export function updateUserIncrement(userID: string, column: string, change: number): Promise<void> {
    return new Promise((resolve, reject) => {
        get({host: dbHost, port: port, path: "/updateUserIncrement", headers: {"UserID": userID, "Data": JSON.stringify({[column]: change})}}, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });

            resp.on('end', () => {
                resolve();
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}

export function fetchUser(userID: string): Promise<IUser> {
    return new Promise((resolve, reject) => {
        get({host: dbHost, port: port, path: "/fetchUser", headers: {"UserID": userID}}, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });
    
            resp.on('end', async () => {
                if (data != "undefined") {
                    resolve(JSON.parse(data));

                } else {
                    addUser(userID).then(_ => {
                        resolve({"id": userID, "xp": 0, "rep": 0, "balance": 1000000, color: "#0099ff", lastRep: 0});
                    }); 
                }
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}

export function deleteUser(userID: string): Promise<void> {
    return new Promise((resolve, reject) => {
        get({host: dbHost, port: port, path: "/deleteUser", headers: {"UserID": userID}}, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });
            
            resp.on('end', () => {
                resolve();
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}