FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg python3 make g++
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
