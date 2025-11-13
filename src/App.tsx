import './App.css'
import Chat from './components/Chat'
import Map from './components/Map'

function App() {

  return (
    <main>
      <div className="chat-container">
        <Chat />
      </div>
      <div className="map-container">
        <Map />
      </div>
    </main>
  )
}

export default App
