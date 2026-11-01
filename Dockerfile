# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@10

# Cache dependencies: only reinstalled when these two files change
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# The API address is baked into the JS at build time
ARG VITE_API_BASE_URL=http://localhost:8088/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN pnpm build

# ---------- Stage 2: serve ----------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80