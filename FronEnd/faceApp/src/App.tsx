import './App.css'
import axios from 'axios'
import { useState } from 'react'

function App() {
  const [data, setData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000');
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
    <>
      <div>
        <h1>Face App</h1>
        <button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Add Face & Show Result'}
        </button>
        <div dangerouslySetInnerHTML={{ __html: data }}></div>
      </div>
    </>
  )
}

export default App
