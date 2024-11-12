# Nostr Event Listener

This project listens to Nostr events and processes them.

## Setup Instructions

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

The script will connect to multiple Nostr relays and begin listening for events.
