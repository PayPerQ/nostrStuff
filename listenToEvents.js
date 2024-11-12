import { SimplePool } from "nostr-tools";
import { relaysArray } from "./utils/relays.js";
import { decode } from "light-bolt11-decoder";
import dotenv from "dotenv";
import SendDirectMessage from "./nostrSendDirectMassage.js";
import WebSocket from "ws";
import NDK from "@nostr-dev-kit/ndk";
import { createEventsList, getEventsList } from "./models/event.server.js";
import { fetchProfileStats } from "./utils/misc.js";

import "websocket-polyfill";
// Polyfill global WebSocket
global.WebSocket = WebSocket;

dotenv.config();

const noteToMonitorIDs = process.env.NOTE_TO_MONITOR_LIST_EVENT_IDS;
console.log("noteToMonitorIDs", noteToMonitorIDs);
const ndk = new NDK({
  explicitRelayUrls: relaysArray,
});
await ndk.connect();

function runNostrSubscription() {
  console.log("Starting the script...");
  let authorsByPubKey = {};

  const pool = new SimplePool();
  console.log("SimplePool instance created.");

  let relays = relaysArray;
  console.log(`Using ${relays.length} relays:`, relays);

  // Add a queue for processing events
  const eventQueue = [];
  let isProcessing = false;
  const MAX_QUEUE_SIZE = 1000; // Limit queue size

  // Function to process events from the queue
  async function processEventQueue() {
    if (isProcessing || eventQueue.length === 0) return;

    isProcessing = true;
    const event = eventQueue.shift();

    try {
      await processEvent(event);
    } catch (error) {
      console.error("Error processing event:", error);
    }

    isProcessing = false;
    setTimeout(processEventQueue, 1000); // Add a 1-second delay between processing events
  }

  // Function to process a single event
  async function processEvent(event) {
    const pTag = event.tags.find((tag) => tag[0] === "p");
    const eTag = event.tags.find((tag) => tag[0] === "e");
    const bolt11Tag = event.tags.find((tag) => tag[0] === "bolt11");
    const PTag = event.tags.find((tag) => tag[0] === "P");

    // First, attempt to get the public key from the 'P' tag
    let pubKeyTag = event.tags.find((tag) => tag[0] === "P");
    let senderPubkey = pubKeyTag ? pubKeyTag[1] : null;

    // If not found, extract the public key from the 'description' field
    if (!senderPubkey) {
      const descriptionTag = event.tags.find((tag) => tag[0] === "description");
      if (descriptionTag) {
        const description = JSON.parse(descriptionTag[1]);
        senderPubkey = description.pubkey;
      }
    }

    const pValue = pTag ? pTag[1] : null;
    const eValue = eTag ? eTag[1] : null;
    const bolt11Value = bolt11Tag ? bolt11Tag[1] : null;
    const PValue = PTag ? PTag[1] : senderPubkey;

    const eventId = eValue;
    const descriptionTag = event.tags.find((tag) => tag[0] === "description");
    const preimageTag = event.tags.find((tag) => tag[0] === "preimage");

    const descriptionValue = descriptionTag ? JSON.parse(descriptionTag[1]) : null;
    const preimageValue = preimageTag ? preimageTag[1] : null;

    const decodedInvoice = bolt11Value ? decode(bolt11Value) : null;
    const amount = decodedInvoice?.sections.find((section) => section.name === "amount")?.value;
    const amountInSats = amount ? parseInt(amount) / 1000 : null; // Convert milli-satoshis to satoshis
    // repost events

    if (event.kind === 6 && noteToMonitorIDs.includes(eValue)) {
      const eventsList = await getEventsList({ npubKey: event.pubkey, eventId: eValue });
      console.log("eventsList repost", eventsList);
      if (!eventsList.eventsList?.length) {
        console.log("Repost event");
        console.log("Repost event and messaging user", event);

        let profileStats = await fetchProfileStats(event.pubkey);
        const stats = profileStats.stats[event.pubkey];
        if (stats) {
          const followersCount = stats?.followers_pubkey_count ?? 0;
          const followingCount = stats?.pub_following_pubkey_count ?? 0;
          console.log("followersCount", followersCount);
          if (followersCount > 5 && followingCount > 5) {
            console.log("senderPubkey", event.pubkey);
            await SendDirectMessage(event.pubkey);
            await createEventsList({ npubKey: event.pubkey, eventId: eValue });
          }
        }
      }
    }
    // Zap event

    const zappedDetected = event.kind === 9734 || event.kind === 9735;
    if (zappedDetected && bolt11Value && PValue !== pValue && eTag && noteToMonitorIDs.includes(eTag[1])) {
      const eventsList = await getEventsList({ npubKey: PValue, eventId: eValue });
      console.log("eventsList Zap", eventsList);
      console.log("eTag", eTag);
      if (!eventsList.eventsList?.length) {
        console.log("Zap event and messaging user", event);
        console.log("senderPubkey", PValue);
        let profileStats = await fetchProfileStats(PValue);
        const stats = profileStats.stats[PValue];
        if (stats) {
          const followersCount = stats?.followers_pubkey_count ?? 0;
          const followingCount = stats?.pub_following_pubkey_count ?? 0;
          console.log("followersCount", followersCount);
          if (followersCount > 5 && followingCount > 5) {
            await SendDirectMessage(PValue);
            await createEventsList({ npubKey: PValue, eventId: eValue });
          }
        }
      }
    }
  }

  console.log("Subscribing to events...");
  let subscription = pool.subscribeMany(
    relays,
    [
      {
        kinds: [9734, 9735, 6],
        since: Math.floor(Date.now() / 1000) - 300, // Last 5 minutes
        limit: 100, // Limit results
      },
    ],
    {
      onevent(event) {
        if (eventQueue.length < MAX_QUEUE_SIZE) {
          eventQueue.push(event);
          processEventQueue();
        } else {
          console.warn("Event queue full. Skipping event.");
        }
      },
      oneose() {
        console.log(`EOSE received. Continuing to listen for new events...`);
      },
      onnotice(notice) {
        console.log(`NOTICE: ${notice}`);
      },
      onerror(error) {
        console.error(`Subscription error:`, error);
      },
      onclose() {
        console.log(`Connection closed. Attempting to reconnect...`);
        // Attempt to reconnect after a short delay
        setTimeout(() => {
          console.log(`Reconnecting...`);
          subscription = pool.subscribeMany(
            relays,
            [
              {
                kinds: [9734, 9735, 6],
                since: Math.floor(Date.now() / 1000) - 300, // Last 5 minutes
                limit: 100, // Limit results
              },
            ],
            this
          );
        }, 5000);
      },
    }
  );
  console.log("Subscription created.");

  // Periodically log that we're still listening
  setInterval(() => {
    console.log("Still listening for kind 9734 and 9735 events...");
    console.log(`Events in queue: ${eventQueue.length}`);
  }, 30000);

  // Add memory usage logging
  setInterval(() => {
    const used = process.memoryUsage();
    console.log(`Memory usage: ${Math.round(used.rss / 1024 / 1024)} MB`);
  }, 60000);

  // Add error handling for unhandled rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  // Keep the script running
  process.on("SIGINT", () => {
    console.log("Received SIGINT. Closing subscription...");
    subscription.close();
    console.log("Subscription closed. Exiting process.");
    process.exit();
  });

  console.log("Script is now running and continuously listening for kind 9734 and 9735 events.");
  console.log("Events will be processed as they are received.");
  console.log("Press Ctrl+C to exit.");
}

// Run the function with error handling
try {
  runNostrSubscription();
} catch (error) {
  console.error("Fatal error in runNostrSubscription:", error);
  process.exit(1);
}
