import { useState } from 'react';
import axios from 'axios';
import './AddManually.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AddManually = () => {

    const [data, setData] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    
      const fetchAddingManually = async () => {
        setLoading(true);
        try {
          const response = await axios.get(API_URL);
          console.log("From Server : ",response);
          setData(response.data);
          console.log("Data set in state : ",response.data);
        } catch (error) {
          console.error('Error fetching data:', error);
          setData('Error loading data');
        } finally {
          setLoading(false);
        }
      }
      return (  
        <div className="manual-section">
            <button onClick={fetchAddingManually} disabled={loading}>
                {loading ? '⏳ Loading...' : '📋 Show Manual Add Example'}
            </button>
            {data && (
            <div className="">
                <h2>Result Added:</h2>
                <div className="result-content">
                    <span><strong>Name:</strong> {data.name}</span><br/>
                    <span><strong>Image ID:</strong> {data.image_id}</span><br/>
                    <span><strong>Subject:</strong> {data.subject}</span><br/>
                    <img src={data.image} alt="Added Face" />
                </div>
            </div>
            )}
        </div>
      );
}