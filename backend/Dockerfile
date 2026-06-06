FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install && npm cache clean --force

COPY . .

RUN npm run build

RUN chown -R node:node /app

USER node

EXPOSE 5000

CMD ["npm", "start"]
