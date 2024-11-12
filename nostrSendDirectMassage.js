import { finalizeEvent } from "nostr-tools/pure";
import { SimplePool } from "nostr-tools/pool";
import { relaysArray } from "./utils/relays.js";
import { convertToHex } from "./utils/misc.js";
import { nip19, nip04 } from "nostr-tools";
import NDK from "@nostr-dev-kit/ndk";
import dotenv from "dotenv";
import WebSocket from "ws";

// Polyfill global WebSocket
global.WebSocket = WebSocket;

dotenv.config();

const pool = new SimplePool();
const relays = relaysArray;

export default async function SendDirectMessage(receiverPubkey) {
  const content = `Here is your free credit for use at PPQ! https://ppq.ai/invite/a344fb55`;

  // Get sender's private key
  const nsecHex = convertToHex(process.env.NOSTR_USER_NSEC);

  // Encrypt content using NIP-04
  const encryptedContent = await nip04.encrypt(nsecHex, receiverPubkey, content);

  // Create event template
  let eventTemplate = {
    kind: 4, // NIP-04 encrypted direct message
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["p", receiverPubkey], // Recipient's pubkey
    ],
    content: encryptedContent,
  };

  // Sign the event
  const signedEvent = finalizeEvent(eventTemplate, nsecHex);
  console.log("Encrypted and signed event:", signedEvent);

  try {
    await Promise.any(pool.publish(relays, signedEvent));
    console.log("Encrypted direct message published!");
    return true;
  } catch (error) {
    console.error("Failed to publish encrypted direct message:", error);
    return false;
  }
}
