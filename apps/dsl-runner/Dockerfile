FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV DATABASE_URL=file:/data/dsl-runner.db
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/dsl-runner.db
RUN apt-get update \
  && apt-get install -y --no-install-recommends redis-server dumb-init \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh && mkdir -p /data
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/start.sh"]
