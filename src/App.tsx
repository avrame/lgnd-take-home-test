import { useCallback, useState } from 'react';
import './App.css'
import Chat from './components/Chat'
import Map from './components/Map'

function App() {
  const [structuredContent, setStructuredContent] = useState<any>(null);

  const handleStructuredContent = useCallback((structuredContent: any) => {
    setStructuredContent(structuredContent);
  }, []);

  return (
    <main>
      <Chat handleStructuredContent={handleStructuredContent} />
      <Map features={structuredContent?.features || []} />
    </main>
  )
}

export default App
