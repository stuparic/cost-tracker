#!/bin/sh

echo "Starting application..."
echo "Current directory: $(pwd)"
echo "Listing /app:"
ls -la /app
echo "Listing /app/dist:"
ls -la /app/dist || echo "dist folder not found!"
echo "Checking if main.js exists:"
test -f /app/dist/main.js && echo "main.js exists" || echo "main.js NOT FOUND"

echo "Starting Node.js..."
exec node /app/dist/main.js
