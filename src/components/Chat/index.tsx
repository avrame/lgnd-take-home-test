import { useRef, useState } from 'react';
import './Chat.css';
import Message, { type MessageData } from './Message';

export default function Chat() {
  const inputMessageRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages([
      ...messages,
      {
        id: crypto.randomUUID(),
        role,
        content,
        date: new Date()
      }
    ]);
  }
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userMessage = formData.get('user-message') as string;
    if (!userMessage) return;
    if (inputMessageRef.current) {
      inputMessageRef.current.value = '';
    }

    // Add user message to messages section
    addMessage('user', userMessage);
  }

  return (
    <section className="chat-container">
      <header><h2>Chat with your LLM</h2></header>
      <section className="messages">
        {messages.slice().reverse().map((message) => (
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