# ─── Stage 1: Install dependencies ───
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Copy monorepo root config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy all workspace package.json files so pnpm can resolve workspace:* deps
COPY apps/web/package.json apps/web/package.json
COPY packages/ packages/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build the Next.js app ───
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages

# Copy the web app source
COPY apps/web/ apps/web/
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Build
RUN cd apps/web && pnpm run build

# ─── Stage 3: Production runner ───
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
