import './App.css'
// import axios from 'axios'
import { useState } from 'react'
import { WebCapture } from './components/WebCapture'
import { AddManually } from './components/AddManually'

function App() {

const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <div className="app-container">
        <h1 className="app-title">Face Recognition App</h1>
        <WebCapture />

        <button 
          className="auth-button" 
          onClick={() => setIsAuthenticated(!isAuthenticated)}
        >
          {isAuthenticated ? '🔒 Logout' : '🔓 Login to Add Manually'}
        </button>
        
        {isAuthenticated&& <AddManually />}
      </div>
    </>
  )
}

export default App
