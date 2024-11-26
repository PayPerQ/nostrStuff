# Nostr Event Listener

This project listens to Nostr events and processes them.

## Setup Instructions

### Option 1: Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Rename `sample.env` to `.env` and update the configuration values

3. Set up the database:

   ```bash
   npx prisma db push
   ```

4. Generate Prisma client:

   ```bash
   npx prisma generate
   ```

5. Run the event listener:
   ```bash
   node listenToEvents.js
   ```

### Option 2: Docker Setup

1. Rename `sample.env` to `.env` and update the configuration values

2. Make sure Docker and Docker Compose are installed on your system

3. Build and start the containers:

   ```bash
   docker-compose up --build
   ```

4. To run Prisma commands inside the Docker container:

   ```bash
   # Generate Prisma client
   docker-compose exec app npx prisma generate

   # Push database schema
   docker-compose exec app npx prisma db push
   ```

5. To stop the containers:
   ```bash
   docker-compose down
   ```

### Useful Docker Commands

- View logs:

  ```bash
  docker-compose logs
  ```

- Restart services:

  ```bash
  docker-compose restart
  ```

- Remove all containers and volumes:
  ```bash
  docker-compose down -v
  ```

The script will connect to multiple Nostr relays and begin listening for events.

## Environment Variables

Make sure your `.env` file includes:

- `POSTGRES_PRISMA_URL`: PostgreSQL connection URL
- `DIRECT_URL`: Direct database connection URL
- `NOTE_TO_MONITOR_LIST_EVENT_IDS`: Array of event IDs to monitor
- `NOSTR_USER_NPUB`: Your Nostr public key
- `NOSTR_USER_NSEC`: Your Nostr private key
