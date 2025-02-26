#!/bin/sh
echo "Starting Node.js app..."

redis-server --daemonize yes

# Wait for Redis to be ready
until redis-cli ping; do
  sleep 1
done

node server.js
