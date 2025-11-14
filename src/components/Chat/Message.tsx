export interface MessageData {
  role: 'user' | 'assistant';
  content: string;
  date: Date;
  id: string;
}

export default function Message({ message }: { message: MessageData }) {
  const { role, content, date } = message;
  return (
    <article className={`message ${role}`}>
      <header>{role}</header>
      <section dangerouslySetInnerHTML={{ __html: content }} />
      <footer>{date.toLocaleString()}</footer>
    </article>
  )
}