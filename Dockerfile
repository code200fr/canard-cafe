FROM node:18-alpine As development
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=16384
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .