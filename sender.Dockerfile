FROM node:12-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install --only=production
COPY ./sender/ ./sender
CMD [ "node", "./sender/index.js" ]
