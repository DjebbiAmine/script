# Runtime image for the prebuilt app (run `npm run build` first — dist/ is copied as-is).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# server.cjs is bundled with --packages=external, so production deps are still needed.
COPY package.json package-lock.json .env.production ./
RUN npm ci --omit=dev && npm cache clean --force

COPY dist ./dist
COPY firebase-applet-config.json ./
# Seed/fallback store; overridden by the bind mount in docker-compose.yml.
COPY --chown=node:node db.json ./

USER node
EXPOSE 3000


CMD ["node", "dist/server.cjs"]
