# Use lightweight Node.js Alpine image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy app source code
COPY . .

# Expose server port
EXPOSE 5000

# Set production environment variables defaults
ENV NODE_ENV=production
ENV PORT=5000

# Start server
CMD [ "node", "server.js" ]
