import { parse as parseHTML, HTMLElement } from 'node-html-parser';
import { EmbedField } from '../core/bot';
import * as lib from '../core/lib';

export async function getWeather(location: string): Promise<Array<any>> {
    /**
     * Gets the weather from OpenWeatherMap API
     * 
     * @param {string} location - The location to obtain the weather
     * @returns - An array containing the weather icon URL, location name and resulting embed fields 
     */
    const parseWeatherData = (jsonData: string): Array<string | EmbedField[] | undefined> => {
        /**
         * Parses the JSON data and retrieve the interesting data
         * 
         * @param {string} jsonData - The response data from OpenWeatherMap
         */
        const data = JSON.parse(jsonData);
        if (data["cod"] !== 200) return [undefined, undefined, []];
        
        const iconURL = (iconCode: string) => `http://openweathermap.org/img/wn/${iconCode}@4x.png`;
        const sunrise: string[] = new Date(data["sys"]["sunrise"] * 1000).toTimeString().split(" ").splice(0, 2);
        const sunset: string[] = new Date(data["sys"]["sunset"] * 1000).toTimeString().split(" ").splice(0, 2);
        const fields: EmbedField[] = [];
        const weatherID: number = data["weather"][0]["id"];
        
        var conditionEmoji: string;
        switch(true) {
            case (weatherID == 801):
                conditionEmoji = "⛅";
                break;
            case(weatherID > 800):
                conditionEmoji = "☁️";
                break;
            case (weatherID == 800):
                conditionEmoji = "☀️";
                break;
            case (weatherID == 781):
                conditionEmoji = "🌪️";
                break;
            case (weatherID >= 700):
                conditionEmoji = "🌫️";
                break;
            case (weatherID >= 600):
                conditionEmoji = "🌨️";
                break;
            case (weatherID >= 500):
                conditionEmoji = "🌧️";
                break;
            case (weatherID >= 300):
                conditionEmoji = "🌧️";
                break;
            case (weatherID >= 200):
                conditionEmoji = "⛈️";
                break
            default:
                conditionEmoji = "🌞";
        }
        
        fields.push({name: "Condition", value: conditionEmoji + data["weather"][0]["description"].charAt(0).toUpperCase() + data["weather"][0]["description"].slice(1), inline: true})
        fields.push({name: "Humidity", value: `💦${data["main"]["humidity"]}%`, inline: true});
        fields.push({name: "Temperature", value: `🌡️ ${data["main"]["temp"]}°C`, inline: true});
        fields.push({name: "Feels like", value: `🌡️ ${data["main"]["feels_like"]}°C`, inline: true});
        fields.push({name: "Wind Speed", value: `💨 ${data["wind"]["speed"]}m/s`, inline: true});
        fields.push({name: "Wind Direction", value: `🧭 ${data["wind"]["deg"]}°`, inline: true});
        fields.push({name: "Sunrise", value: `☀️ ${sunrise[0]} (${sunrise[1]})`});
        fields.push({name: "Sunset", value: `🌙 ${sunset[0]} (${sunset[1]})`});
        
        return [iconURL(data["weather"][0]["icon"]), data["name"], fields];
    }

    const response: string = await lib.httpGetRequest(`http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`);
    return parseWeatherData(response);
}

export async function getWiki(query: string): Promise<Array<string | EmbedField | undefined> | undefined> {
    /**
     * Get a summary of a wikipedia page given a query
     * 
     * @param {string} query - The query to search for
     * @returns {Promise} - The results
     */
    interface WikiPageResult {
        wikiURL: string;
        wikiPage: HTMLElement;
        summary: string;
    }
    const getSearchResults = async (query: string) => {
        const params = {"action": "query", "format": "json", "list": "search", "srsearch": query,
        "srlimit": "1", "srinfo": "totalhits", "srprop": "snippet"};
        const searchResults = JSON.parse(await lib.httpsGetRequest(lib.parseURLWithParams("https://en.wikipedia.org/w/api.php", params)));
        if (searchResults["query"]["searchinfo"]["totalhits"] == 0) {
            console.log("und")
            return undefined;
        }
        return searchResults;
    }
    const getWikiPage = async (title: string): Promise<WikiPageResult> => {
        /**
         * Gets the actual wikipedia page given the title
         * 
         * @param {string} title - The Wikipedia title of the page
         * @returns {Promise}
         */
        var wikiURL: string = `https://en.wikipedia.org/wiki/${title.split(' ').join('_')}`;
        var wikiPage: HTMLElement = parseHTML(await lib.httpsGetRequest(wikiURL));
        var content: HTMLElement[] = wikiPage.querySelector(".mw-parser-output").querySelectorAll('p');
        var summary: string = "No information found";
        for (const p of content) {
            if (p.text.length > 200 || p.text.includes("commonly refers to:")) {
                summary = p.text; break;
            }
        }
        return {wikiURL: wikiURL, wikiPage: wikiPage, summary: summary}
    }
    const getBestImage = (wikiPage: HTMLElement): HTMLElement => {
        /**
         * Gets the image with highest resolution of a Wikipedia page
         * 
         * @param {HTMLElement} wikiPage - The HTMLElement of the Wikipedia page
         */
        const bestImage: Array<HTMLElement | number> = [wikiPage, 0]; // Placeholders
        const images: HTMLElement[] = wikiPage.querySelectorAll('img');
        for (const image of images) {
            const size: number = parseInt(image.getAttribute("width") || "0") + parseInt(image.getAttribute("height") || "0");
            if (size > bestImage[1]) {
                bestImage[1] = size;
                bestImage[0] = image;
            }
        }
        return bestImage[0] as HTMLElement;
    }

    const searchResults = await getSearchResults(query);
    if (searchResults == undefined) return undefined;

    var title: string = searchResults["query"]["search"][0]["title"];
    var {wikiURL, wikiPage, summary} = await getWikiPage(title);

    if (summary.includes("commonly refers to:")) {
        // If result is a wikipedia index page, select the first index and get the page again
        title = wikiPage.querySelector('.mw-parser-output').querySelectorAll('li')[0].querySelector('a').getAttribute('title') || "";
        var {wikiURL, wikiPage, summary} = await getWikiPage(title);
    }

    // Get a picture from wikipedia for the embed image
    var mainImage: string | undefined;
    const infoBoxImage: HTMLElement = wikiPage.querySelector(".infobox")?.querySelector("img");
    if (infoBoxImage == undefined) {
        mainImage = "https:" + getBestImage(wikiPage).getAttribute("src") || "";
    } else {
        mainImage = "https:" + infoBoxImage.getAttribute("src") || "";
    }
    return [mainImage, {name: title, value: `${summary.substring(0, 950)} [Read more.](${wikiURL})`}];
}
