// // src/App.tsx

// import React, { useState, useRef, useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
// import remarkGfm from 'remark-gfm';
// import './App.css';
// import { streamChatResponse } from './services/api';

// interface Message {
//   id: number;
//   text: string;
//   sender: 'user' | 'bot';
// }

// // Simple blinking cursor component
// const BlinkingCursor = () => <span className="blinking-cursor">|</span>;

// function App() {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [inputValue, setInputValue] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const chatWindowRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (chatWindowRef.current) {
//       chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
//     }
//   }, [messages]);

//   const handleSendMessage = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!inputValue.trim() || isLoading) return;

//     const userMessage: Message = {
//       id: Date.now(),
//       text: inputValue,
//       sender: 'user',
//     };

//     setMessages(prev => [
//       ...prev,
//       userMessage,
//       { id: Date.now() + 1, text: '', sender: 'bot' }
//     ]);

//     setIsLoading(true);
//     const currentInput = inputValue;
//     setInputValue('');

//     streamChatResponse(
//       { topic: currentInput },
//       (chunk) => {
//         // Append the new chunk to the last message (the bot's response)
//         setMessages(prev => {
//           const newMessages = [...prev];
//           const lastMessage = newMessages[newMessages.length - 1];
//           // The first chunk received might be just a newline, so we trim it.
//           if (lastMessage.text === '') {
//             lastMessage.text = chunk.trimStart();
//           } else {
//             lastMessage.text += chunk;
//           }
//           return newMessages;
//         });
//       },
//       () => { // onComplete
//         console.log("Stream finished successfully.");
//         setIsLoading(false);
//       },
//       () => { // onError
//         setMessages(prev => {
//           const newMessages = [...prev];
//           const lastMessage = newMessages[newMessages.length - 1];
//           if (lastMessage.text === '') { // Only show error if no text was received at all
//             lastMessage.text = "Sorry, something went wrong. Please check the console.";
//           }
//           return newMessages;
//         });
//         setIsLoading(false);
//       }
//     );
//   };

//   return (
//     <div className="app-container">
//       <header className="header">
//         Super Story Factory Chat
//       </header>
//       <div className="chat-window" ref={chatWindowRef}>
//         {messages.map((msg, index) => (
//           <div key={msg.id} className={`message ${msg.sender}`}>
//             <ReactMarkdown remarkPlugins={[remarkGfm]}>
//               {msg.text}
//             </ReactMarkdown>
//             {/* Show cursor only on the very last message if it's a bot and loading */}
//             {isLoading && msg.sender === 'bot' && index === messages.length - 1 && <BlinkingCursor />}
//           </div>
//         ))}
//       </div>
//       <form className="chat-input-form" onSubmit={handleSendMessage}>
//         <input
//           type="text"
//           className="chat-input"
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           placeholder="Ask anything..."
//           disabled={isLoading}
//         />
//         <button type="submit" className="send-button" disabled={isLoading}>
//           {isLoading ? 'Thinking...' : 'Send'}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default App;

// src/App.tsx

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';
import { createChatStream } from './services/api';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const BlinkingCursor = () => <span className="blinking-cursor">|</span>;

// A new component to render the structured story data
const StoryResult = ({ data }: { data: any }) => {
  return (
    <div className="story-result">
      <h3>News Report</h3>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.report || ""}</ReactMarkdown>
      <hr />
      <h4>Tweets</h4>
      <ul>
        {(data.tweets || []).map((tweet: string, index: number) => (
          <li key={index}>{tweet}</li>
        ))}
      </ul>
      <hr />
      <h4>Hashtags</h4>
      <p>{(data.hashtags || []).join(' ')}</p>
    </div>
  );
};


function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const currentEventSource = useRef<EventSource | null>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (currentEventSource.current) {
      currentEventSource.current.close();
    }

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
    };

    setMessages(prev => [
      ...prev,
      userMessage,
      { id: Date.now() + 1, text: '', sender: 'bot' }
    ]);

    setIsLoading(true);
    const prompt = inputValue;
    setInputValue('');

    const eventSource = createChatStream(prompt);
    currentEventSource.current = eventSource;

    eventSource.onopen = () => console.log('Stream connection opened.');

    eventSource.onmessage = (event) => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.sender === 'bot') {
          // Append all data. We will parse it during render.
          lastMessage.text += event.data + '\n';
        }
        return newMessages;
      });
    };

    eventSource.onerror = () => {
      console.log('Stream closed by server.');
      setIsLoading(false);
      eventSource.close();
      currentEventSource.current = null;
    };
  };

  // Custom renderer for the bot messages
  const renderBotMessage = (message: Message) => {
    const content = message.text.trim();
    // Try to parse the content as JSON.
    try {
      // Look for JSON block inside ```json ... ```
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        // If it's a story object, use the special component
        if (parsedJson.report && parsedJson.tweets) {
          return <StoryResult data={parsedJson} />;
        }
      }
    } catch (e) {
      // Not valid JSON, or not the format we expect. Fall through to render as Markdown.
    }
    // Default to rendering as Markdown
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  };

  return (
    <div className="app-container">
      <header className="header">
        Super Story Factory
      </header>
      <div className="chat-window" ref={chatWindowRef}>
        {messages.map((msg, index) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.sender === 'user' ? (
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            ) : (
              renderBotMessage(msg)
            )}
            {isLoading && msg.sender === 'bot' && index === messages.length - 1 && <BlinkingCursor />}
          </div>
        ))}
      </div>
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me anything, for a story, or for a joke..."
          disabled={isLoading}
        />
        <button type="submit" className="send-button" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default App;