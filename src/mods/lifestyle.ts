import { get } from 'http';
import { EmbedField } from '../core/bot';

export function getWeather(location: string): Promise<Array<any>> {
    /**
     * Gets the weather from OpenWeatherMap API
     * 
     * @param {string} location - The location to obtain the weather
     * @returns - An array containing the weather icon URL, location name and resulting embed fields 
     */
    const parseWeatherData = (jsonData: string) => {
        const data = JSON.parse(jsonData);
        if (data["cod"] !== 200) {
            return [undefined, undefined, []]
        }

        const iconURL = (iconCode: string) => `http://openweathermap.org/img/wn/${iconCode}@4x.png`;
        const sunrise: string[] = new Date(data["sys"]["sunrise"] * 1000).toTimeString().split(" ").splice(0, 2)
        const sunset: string[] = new Date(data["sys"]["sunset"] * 1000).toTimeString().split(" ").splice(0, 2)
        const fields: EmbedField[] = [];

        const weatherID: number = data["weather"][0]["id"]
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
        fields.push({name: "Sunrise", value: `🌙 ${sunset[0]} (${sunset[1]})`});
        
        return [iconURL(data["weather"][0]["icon"]), data["name"], fields];
    }

    return new Promise((resolve, reject) => {
        get(`http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHERMAP_API_KEY}&units=metric`, resp => {
            let data: string = "";
    
            resp.on('data', chunk => {
                data += chunk;
            });
            
            resp.on('end', () => {
                resolve(parseWeatherData(data));
            });

            resp.on('error', () => {
                reject();
            });
        });
    });
}