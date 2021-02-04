FROM node:14

WORKDIR /app

RUN apt-get update

COPY package*.json ./

RUN npm install



COPY build ./build
COPY logs ./logs

CMD ["node", "/app/build/app.js"]
