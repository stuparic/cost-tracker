#!/bin/sh

echo "Starting application..."
echo "Current directory: $(pwd)"
echo "Listing /usr/src/app:"
ls -la /usr/src/app
echo "Listing /usr/src/app/dist:"
ls -la /usr/src/app/dist || echo "dist folder not found!"
echo "Checking if main.js exists:"
test -f /usr/src/app/dist/main.js && echo "main.js exists" || echo "main.js NOT FOUND"

echo "Starting Node.js..."
exec node /usr/src/app/dist/main.js
