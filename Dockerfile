# Use the official Node.js image
FROM node:23-alpine

# RUN apt update && apt install -y redis-server
# RUN apk add --no-cache redis
# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

RUN chmod +x start.sh

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["sh", "./start.sh"]
