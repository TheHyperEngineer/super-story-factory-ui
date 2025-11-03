import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react'; // Use 'type' for type-only imports
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

    const botMessagePlaceholderId = Date.now() + 1;
    setMessages(prev => [
      ...prev,
      userMessage,
      { id: botMessagePlaceholderId, text: '', sender: 'bot' }
    ]);

    setIsLoading(true);
    const prompt = inputValue;
    setInputValue('');

    const eventSource = createChatStream(prompt);
    currentEventSource.current = eventSource;

    let fullResponse = '';

    eventSource.onopen = () => {
      console.log('Stream connection opened.');
    };

    eventSource.onmessage = (event) => {
      fullResponse += event.data + '\n';
      
      setMessages(prev => {
        const newMessages = [...prev];
        const botMessage = newMessages.find(m => m.id === botMessagePlaceholderId);
        if (botMessage) {
          botMessage.text = fullResponse;
        }
        return newMessages;
      });
    };

    eventSource.onerror = () => {
      console.log('Stream closed by server.');
      
      setMessages(prev => {
        const newMessages = [...prev];
        const botMessage = newMessages.find(m => m.id === botMessagePlaceholderId);
        if (botMessage) {
          botMessage.text = fullResponse;
        }
        return newMessages;
      });

      setIsLoading(false);
      eventSource.close();
      currentEventSource.current = null;
    };
  };

  const renderBotMessage = (message: Message) => {
    const content = message.text.trim();
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.report && parsedJson.tweets) {
          return <StoryResult data={parsedJson} />;
        }
      }
    } catch (e) {
      // Not JSON, fall through
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