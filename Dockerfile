# Use Node.js LTS version
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy client package files
COPY client/package*.json ./client/

# Install client dependencies
WORKDIR /app/client
RUN npm install --legacy-peer-deps

# Copy client project files
COPY client/ ./

# Expose port 3000
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]
