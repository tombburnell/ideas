# Build from apps/yellow-sub: docker build -t yellow-sub .
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY admin-web/package.json admin-web/
COPY packages/sdk/package.json packages/sdk/
RUN npm ci
COPY api api
COPY admin-web admin-web
COPY packages/sdk packages/sdk
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN cd api && npx prisma generate && npm run build
RUN cd admin-web && npm run build
RUN cd packages/sdk && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY admin-web/package.json admin-web/
COPY packages/sdk/package.json packages/sdk/
RUN npm ci --omit=dev
COPY --from=builder /app/api/prisma ./api/prisma
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/admin-web/dist ./admin-web/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
WORKDIR /app/api
ENV PORT=3000
ENV ADMIN_DIST_PATH=../admin-web/dist
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/entrypoint.sh"]
