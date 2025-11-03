// // src/services/api.ts

// const API_BASE_URL = 'http://localhost:8080';

// export interface StreamRequest {
//   topic: string;
// }

// export const streamChatResponse = (
//   request: StreamRequest,
//   onChunk: (chunk: string) => void,
//   onComplete: () => void,
//   onError: (error: Event) => void
// ) => {
//   // Use POST and send the topic in the body, which is more robust for complex inputs.
//   // We will need to create a small server-side proxy or use a different library if we must use GET.
//   // For now, let's assume we can fix the client to handle the server's behavior.
//   const eventSource = new EventSource(`${API_BASE_URL}/stream-chat?userQuestion=${encodeURIComponent(request.topic)}`);

//   let receivedData = false;

//   eventSource.onmessage = (event) => {
//     receivedData = true;
//     // The server might send multiple data chunks.
//     // The final message from our current agent is a single block of text.
//     // We need to handle the newline characters properly.
//     const lines = event.data.split('\n');
//     for (const line of lines) {
//       onChunk(line + '\n'); // Send each line as a chunk, preserving line breaks
//     }
//   };

//   eventSource.onerror = (error) => {
//     // If we received data and then the connection closed, it's a success, not an error.
//     // The 'readyState' for a closed connection is 2 (CLOSED).
//     if (receivedData && eventSource.readyState === 2) {
//       console.log("Stream closed by server, but data was received. Treating as success.");
//       onComplete();
//     } else {
//       console.error('EventSource failed:', error);
//       onError(error);
//     }
//     // Always close the connection on any error or completion.
//     eventSource.close();
//   };

//   eventSource.onopen = () => {
//     console.log('Connection to stream opened.');
//   };

//   return eventSource;
// };


const API_BASE_URL = 'http://localhost:8080/api'; // Updated base URL

/**
 * Creates and returns an EventSource connection to the unified chat endpoint.
 * @param prompt The user's message.
 * @returns A new EventSource instance.
 */
export function createChatStream(prompt: string): EventSource {
  const url = `${API_BASE_URL}/chat?prompt=${encodeURIComponent(prompt)}`;
  const eventSource = new EventSource(url);
  return eventSource;
}