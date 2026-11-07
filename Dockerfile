FROM node:20-alpine
WORKDIR /app
COPY gangstamen.html ./
COPY server ./server
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/server.js"]
