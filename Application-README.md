# Super Story Factory UI - Technical Documentation

## 1. Overview

This is a modern, single-page application (SPA) built with React that serves as the user interface for the Super Story Factory API. It provides a real-time, streaming chat experience, renders Markdown content, and can display complex JSON data in a user-friendly format.

The application is designed for a clean separation of concerns, where the UI is responsible only for presentation and user interaction, while all business logic resides in the backend service.

### Core Technologies

*   **React 18+** (with functional components and hooks)
*   **TypeScript** (for type safety and improved developer experience)
*   **Vite** (as the build tool and development server)
*   **`react-markdown`**: For rendering Markdown content from the API.
*   **`remark-gfm`**: Plugin for GitHub Flavored Markdown support.
*   **`EventSource` API**: Native browser API for handling Server-Sent Events (SSE) streams.

## 2. Project Structure

The project follows a standard Vite + React structure.

```
chat-ui/
├── public/         # Static assets
├── src/
│   ├── components/   # (Optional) Reusable UI components
│   ├── services/
│   │   └── api.ts    # Logic for communicating with the backend
│   ├── App.css       # Main application styles
│   ├── App.tsx       # The main application component
│   ├── main.tsx      # Entry point of the React application
│   └── ...           # Other standard React/Vite files
└── package.json      # Project dependencies and scripts
```

### Key Components & Logic

*   **`App.tsx`**: This is the root component of the application. It manages the entire state of the chat, including:
    *   `messages`: An array of message objects representing the conversation history.
    *   `inputValue`: The current text in the input box.
    *   `isLoading`: A boolean flag to indicate when the app is waiting for a response from the backend.
    *   It contains the main `handleSendMessage` function which orchestrates the API call and state updates.
    *   It uses a `useRef` to manage the lifecycle of the `EventSource` connection, ensuring it's properly closed.

*   **`api.ts`**: This service module abstracts the backend communication.
    *   It contains the `createChatStream` function, which takes a user's prompt and returns a new `EventSource` instance connected to the backend's `/api/chat` endpoint. This keeps API logic separate from the UI components.

*   **Rendering Logic**:
    *   The `renderBotMessage` function within `App.tsx` is responsible for intelligently rendering responses.
    *   It first attempts to parse the incoming text as a JSON object matching the structure of a "story" response. If successful, it renders the specialized `StoryResult` component.
    *   If the text is not a valid story JSON, it falls back to using the `<ReactMarkdown>` component to render it as rich text. This allows the UI to handle both complex data structures and simple text/markdown streams from a single data source.

## 3. Setup and Installation

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (usually included with Node.js)
*   A running instance of the [Super Story Factory API](#) on `http://localhost:8080`.

### Installation

1.  Clone the repository containing this `chat-ui` project.
2.  Navigate to the project's root directory (`/chat-ui`).
3.  Install the required npm packages:
    ```bash
    npm install
    ```

### Running the Development Server

To start the application in development mode with hot-reloading:

```bash
npm run dev
```

This will launch a local server, typically on **`http://localhost:5173`**. Open this URL in your web browser to use the application. The app will automatically reload if you make changes to the source files.

## 4. Connecting to the Backend

The frontend is configured to connect to a backend running at `http://localhost:8080`. This is defined in `src/services/api.ts`.

```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

If your backend is running on a different address or port, you must update this constant.

**CORS Note:** The backend must be configured to accept requests from the frontend's origin (`http://localhost:5173`). The provided Spring Boot backend uses the `@CrossOrigin` annotation on its controllers to handle this.

## 5. Building for Production

When you are ready to deploy the application, you can create an optimized production build with the following command:

```bash
npm run build
```

This will generate a `dist` folder containing static HTML, CSS, and JavaScript files. These files can be served by any static file server (like Nginx, Vercel, or even a Spring Boot `static` folder).
```