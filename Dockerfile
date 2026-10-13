FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chmod -R a+rwX /app/data && npm run build

ENV NODE_ENV=production
EXPOSE 10000

CMD ["sh", "-c", "mkdir -p /app/data && ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-10000}"]
