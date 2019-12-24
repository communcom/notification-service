FROM node:12-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install --only=production
COPY ./processor/ ./processor
CMD ["node", "./processor/index.js"]
