FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

# Better layer caching: dependencies only change when package files change
COPY package.json package-lock.json ./

# Production dependencies only
RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy only application code
COPY --chown=node:node src ./src

# Run as non-root
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]