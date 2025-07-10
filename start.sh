#!/bin/bash

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Start backend
echo "Starting backend..."
cd backend
uvicorn server:app --host 0.0.0.0 --port $PORT