FROM node:18-alpine As development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .