#!/bin/sh

# Start nginx in background
nginx -g 'daemon off;' &

# Start API in background
cd /app/api
node index.js &

# Start scheduler in foreground (keeps container alive)
cd /app/scheduler
exec node index.js
