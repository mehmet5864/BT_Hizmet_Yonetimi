# BT Hizmet Yönetimi 1.0.0 — üretim imajı (Next.js + Prisma 7 + PostgreSQL)

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Derleme sırasında veritabanına bağlanılmaz; yalnızca istemci üretilir.
ENV DATABASE_URL="postgresql://bt:bt@127.0.0.1:5432/bt"
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=43130
ENV HOSTNAME=0.0.0.0
ENV SEED_ON_START=true
ENV PRISMA_HIDE_UPDATE_MESSAGE=true
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/fonts ./fonts
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
  && mkdir -p /data /app/public/uploads

EXPOSE 43130
VOLUME ["/data", "/app/public/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||43130)+'/giris').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
