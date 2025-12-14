import './App.css'
import axios from 'axios'
import { useState } from 'react'
import { WebCapture } from './components/WebCapture'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      console.log(response.data);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData('Error loading data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <h1 className="app-title">Face Recognition App</h1>
      <WebCapture />
      <div className="manual-section">
        <button onClick={fetchData} disabled={loading}>
          {loading ? '⏳ Loading...' : '📋 Show Manual Add Example'}
        </button>
        {data && (
          <div className="html-content" dangerouslySetInnerHTML={{ __html: data }}></div>
        )}
      </div>
    </div>
  )
}

export default App
