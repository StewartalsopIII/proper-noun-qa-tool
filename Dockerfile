# Use the official Node.js 23.11.0 Alpine image as a base
FROM node:23.11.0-alpine

# Passcode build-time injection
ARG NEXT_PUBLIC_PASSCODE=changeme
ENV NEXT_PUBLIC_PASSCODE=$NEXT_PUBLIC_PASSCODE

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
# Using --omit=dev assuming devDependencies are not needed for production
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on (default Next.js port)
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"] 