import './App.css'
// import axios from 'axios'
import { useState } from 'react'
import { WebCapture } from './components/WebCapture'
import { AddManually } from './components/AddManually'
import { WebCaptureV2 } from './components/WebCaptureV2'
import ParticlesBackground from './components/ParticlesBackground'

function App() {

const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <ParticlesBackground
        particleColors={['#ffffff', '#ffffff']}
        particleCount={200}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={false}
        disableRotation={false}
      />
      
      <div className="app-container">
        <h1 className="app-title">Face Recognition App</h1>
        
        {/* <WebCapture /> */}
        <WebCaptureV2 />

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
