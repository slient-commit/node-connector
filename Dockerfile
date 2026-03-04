FROM node:22-alpine

# sqlite3 requires native compilation
RUN apk add --no-cache python3 make g++ nginx

# --- Build frontend ---
WORKDIR /app/front
COPY front/node-connector/package.json ./
RUN npm install
COPY front/node-connector/ .
RUN npm run build

# Copy build output to nginx html dir
RUN mkdir -p /usr/share/nginx/html && \
    cp -r /app/front/build/* /usr/share/nginx/html/

# Docker config: API is on localhost:3001 inside the container
RUN echo 'window.__API_BASE_URL__ = "/api";' > /usr/share/nginx/html/config.js

# --- Install API dependencies ---
WORKDIR /app/api
COPY api/package.json ./
RUN npm install --production
COPY api/ .
RUN mkdir -p /app/api/db /app/api/sheets

# --- Install scheduler dependencies ---
WORKDIR /app/scheduler
COPY scheduler/package.json ./
RUN npm install --production
COPY scheduler/ .

# --- Nginx config ---
COPY nginx.conf /etc/nginx/http.d/default.conf

# --- Entrypoint ---
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Default environment variables for API
ENV PORT=3001
ENV DB_PATH=./db/sheets.db
ENV JWT_SECRET=change_me_jwt_secret
ENV REFRESH_TOKEN_SECRET=change_me_refresh_secret
ENV INTERNAL_API_KEY=change_me_internal_key

# Default environment variables for scheduler
ENV API_BASE_URL=http://127.0.0.1:3001
ENV LOG_LEVEL=info

EXPOSE 80

WORKDIR /app
CMD ["/entrypoint.sh"]
