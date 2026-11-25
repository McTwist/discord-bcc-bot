# syntax=docker/dockerfile:1
#FROM dockette/nodejs:v18
FROM oven/bun:1.4-alpine
WORKDIR /app
COPY package.json bun.lock .
COPY src/ src/
RUN bun ci
CMD ["bun", "start"]
