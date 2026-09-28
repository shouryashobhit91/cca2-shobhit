FROM node:22-alpine

WORKDIR /app

# Dependencies are installed before the source is copied so that Docker reuses
# the cached layer whenever only application code has changed.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ARG GIT_SHA=local
ENV GIT_SHA=$GIT_SHA
ENV PORT=3000

USER node
EXPOSE 3000

CMD ["node", "server.js"]
