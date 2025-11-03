import { useState, useRef, useEffect, FormEvent } from 'react';
import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';
import { createChatStream } from './services/api';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const BlinkingCursor: FC = () => <span className="blinking-cursor">|</span>;

const StoryResult: FC<{ content: string }> = ({ content }) => {
  try {
    const data = JSON.parse(content);
    return (
      <div className="story-result">
        <h3>News Report</h3>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.report || "No report available."}</ReactMarkdown>
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
  } catch (e) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }
};

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
    };

    const botMessageId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      userMessage,
      { id: botMessageId, text: '', sender: 'bot' }
    ]);

    setIsLoading(true);
    const prompt = inputValue;
    setInputValue('');

    const eventSource = createChatStream(prompt);
    eventSourceRef.current = eventSource;

    // Use a local variable to accumulate the full response.
    let responseAccumulator = '';

    eventSource.onmessage = (event) => {
      // Append every piece of data received to the accumulator.
      responseAccumulator += event.data + '\n';
      
      // Update the UI in real-time for the typewriter effect.
      // This is now safe because we are always setting the text to the *entire* accumulated string.
      setMessages(prev => {
        const newMessages = [...prev];
        const botMessage = newMessages.find(m => m.id === botMessageId);
        if (botMessage) {
          botMessage.text = responseAccumulator;
        }
        return newMessages;
      });
    };

    eventSource.onerror = (err) => {
      console.log('Stream closed by server or error occurred.', err);
      setIsLoading(false);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Perform one final update to ensure the complete message is set,
      // just in case the last onmessage event didn't finish before the error.
      setMessages(prev => {
        const newMessages = [...prev];
        const botMessage = newMessages.find(m => m.id === botMessageId);
        if (botMessage && botMessage.text === '') {
            // If we received nothing, show an error.
            botMessage.text = "Sorry, there was an issue receiving the response.";
        } else if (botMessage) {
            // Otherwise, ensure the final accumulated text is set.
            botMessage.text = responseAccumulator;
        }
        return newMessages;
      });
    };
  };

  const renderBotMessage = (message: Message) => {
    const content = message.text.trim();
    if (content.startsWith('```json')) {
        const jsonString = content.replace(/^```json\s*|\s*```$/g, '');
        try {
            const parsedJson = JSON.parse(jsonString);
            if (parsedJson.report) {
                return <StoryResult content={jsonString} />;
            }
        } catch (e) {
            console.error("Failed to parse story JSON", e);
        }
    }
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