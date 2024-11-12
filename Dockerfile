FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json (if they exist)
COPY package*.json ./

# Install dependencies, nodemon globally, and cron
RUN npm install && npm install -g nodemon && apt-get update && apt-get install -y cron

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Create a script to run nodemon and restart it
RUN echo '#!/bin/bash\nwhile true; do\n  nodemon --exitcrash listenToEvents.js\n  sleep 3600\ndone' > /app/run_with_restart.sh && chmod +x /app/run_with_restart.sh

# Run the script
CMD ["/app/run_with_restart.sh"]