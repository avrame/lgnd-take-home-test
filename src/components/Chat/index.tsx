import { useRef, useState } from 'react';
import './Chat.css';
import Message, { type MessageData } from './Message';
import useWebSocket from 'react-use-websocket';
import { marked } from 'marked';

export default function Chat() {
  const inputMessageRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000/api/chat', {
    onOpen: () => {
      console.log('WebSocket connection established');
    },
    onMessage: async (event) => {
      const data = JSON.parse(event.data);
      addMessage('assistant', await marked.parse(data.response));
    },
    shouldReconnect: (_closeEvent: CloseEvent) => true,
  })

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
  
  const handleSubmitMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const userMessage = formData.get('user-message') as string;
    if (!userMessage) return;
    if (inputMessageRef.current) {
      inputMessageRef.current.value = '';
    }

    // Add user message to messages section
    addMessage('user', userMessage);

    sendJsonMessage({ query: userMessage });
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
        <form onSubmit={handleSubmitMessage}>
          <div className="message-input">
            <input ref={inputMessageRef} type="text" name="user-message" placeholder="Message" />
            <button type="submit">Send</button>
          </div>
        </form>
      </footer>
    </section>
  )
}