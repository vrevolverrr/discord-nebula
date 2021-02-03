import * as http from 'http';
import * as https from 'https';

export function isToday(timestamp: number): boolean {
  return (new Date(timestamp)).getDay() == (new Date(Date.now()).getDay());
}

export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  return (new Date(timestamp1)).getDay() == (new Date(timestamp2).getDay());
}

export function hash(string_to_hash: string): number {
    /**
     * @param {string} string_to_hash - The string to generate a hash code
     * @returns {number} - The hash code of given string
     */
    var hash = 0, i, chr;
    for (i = 0; i < string_to_hash.length; i++) {
      chr = string_to_hash.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }

    return hash;
}

export function validateColor(hexColor: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hexColor);
}

export function parseURLWithParams(URL: string, param: Record<string, string> | string[][]) {
  const params = new URLSearchParams(param);
  return URL + "?" + params.toString();
}

export async function httpGetRequest(options: string | http.RequestOptions | URL): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(options, resp => {
        let data: string = "";

        resp.on('data', chunk => {
            data += chunk;
        });
        
        resp.on('end', () => {
            resolve(data);
        });

        resp.on('error', () => {
            reject();
        });
    });
  });
}

export async function httpsGetRequest(options: string | http.RequestOptions | URL): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(options, resp => {
        let data: string = "";

        resp.on('data', chunk => {
            data += chunk;
        });
        
        resp.on('end', () => {
            resolve(data);
        });

        resp.on('error', () => {
            reject();
        });
    });
  });
}
