# syntax=docker/dockerfile:1

FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --chown=node:node src ./src

RUN mkdir -p /app/logs \
    && chown node:node /app/logs

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
