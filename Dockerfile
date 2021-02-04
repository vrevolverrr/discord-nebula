FROM node:14

WORKDIR /app

RUN apt-get update

COPY package*.json ./

RUN npm install

ENV NEBULA_BOT_TOKEN=ODAyODYzMDMwMTk4OTkyOTM3.YA1adg.s4Zh0c1Q1_GSBFIek3avC8Sl9ek
ENV OPENWEATHERMAP_API_KEY=9e2bf3b0efa1937e242158695cce114f

COPY build ./build
COPY logs ./logs

CMD ["node", "/app/build/app.js"]
