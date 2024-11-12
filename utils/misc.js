import { nip19 } from "nostr-tools";
import axios from "axios";

export function convertToHex(key) {
  try {
    const { data } = nip19.decode(key);
    return data;
  } catch (error) {
    console.error("Error decoding npub:", error);
    return null;
  }
}

export async function fetchProfileStats(pubKey) {
  const maxRetries = 5; // Set the maximum number of retries
  const retryDelay = 3000; // Set the delay in milliseconds (3000ms = 3 seconds)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.nostr.band/v0/stats/profile/${pubKey}`;
      const response = await axios.get(url);
      return response.data; // Return the data if the request is successful
    } catch (error) {
      console.error(`Attempt ${attempt} - Error fetching profile stats for ${pubKey}:`, error);
      if (attempt === maxRetries) throw error; // Throw the error if the max number of retries is reached

      // Wait for the specified delay before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}
