import { useRef, useState } from 'react';
import './Chat.css';
import Message, { type MessageData } from './Message';
import { marked } from 'marked';

export default function Chat() {
  const inputMessageRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: crypto.randomUUID(),
        role,
        content,
        date: new Date()
      }
    ]);
  }
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userMessage = formData.get('user-message') as string;
    if (!userMessage) return;
    if (inputMessageRef.current) {
      inputMessageRef.current.value = '';
    }

    // Add user message to messages section
    addMessage('user', userMessage);

    // Call the API to search for map features
    const response = await fetch('http://localhost:3000/api/chat/search_map_features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: userMessage }),
    });
    const json = await response.json();
    console.log('API response:', json);
    
    addMessage('assistant', await marked.parse(json.response.text));
  }

  return (
    <section className="chat-container">
      <header><h2>Chat with your AI map assistant</h2></header>
      <section className="messages">
        {messages.toReversed().map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </section>
      <footer>
        <form onSubmit={handleSubmit}>
          <div className="message-input">
            <input ref={inputMessageRef} type="text" name="user-message" placeholder="Message" />
            <button type="submit">Send</button>
          </div>
        </form>
      </footer>
    </section>
  )
}