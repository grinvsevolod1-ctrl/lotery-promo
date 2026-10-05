# syntax=docker/dockerfile:1
#
# Multi-stage image for the VPS.
#   builder -> also used by the one-off `migrate` service (has drizzle-kit)
#   runner  -> minimal Next.js standalone server
#
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat && npm install -g pnpm@12.3.4
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1 \
    DOCKER_BUILD=1
# NEXT_PUBLIC_* values are inlined at build time, so they arrive as build args.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_SUPPORT_HOURS
ARG NEXT_PUBLIC_TELEGRAM_URL
ARG NEXT_PUBLIC_VK_URL
ARG DEPLOYMENT_VERSION
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
