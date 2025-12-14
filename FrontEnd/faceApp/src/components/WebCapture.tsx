import WebCam from "react-webcam";
import './WebCapture.css';
import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const WebCapture = () => {

const [screenShotSrc, setScreenshotSrc] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [result, setResult] = useState<any>(null);

const handleCapture = async (screenshot: string) => {
    setScreenshotSrc(screenshot);
    setLoading(true);
    
    try {
        const response = await axios.post(`${API_URL}/capture`, {
            image: screenshot,
            name: 'Sebastian' // Puedes hacer esto dinámico
        });
        
        console.log('Face added:', response.data);
        setResult(response.data);
    } catch (error: any) {
        console.error('Error uploading image:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Error al procesar la imagen';
        alert(errorMessage);
    } finally {
        setLoading(false);
    }
};

    return (
    <div className="webcam-container"> 
        <WebCam 
            audio={false} 
            className="webcam-video"
            screenshotFormat="image/jpeg"
            screenshotQuality={0.95}
            videoConstraints={{
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            }}
            mirrored={true}
        >
            {({ getScreenshot }) => (
                <>
                    <button 
                        onClick={() => {
                            const screenShot = getScreenshot();
                            if (screenShot) {
                                handleCapture(screenShot);
                            }
                        }} 
                        className="capture-button"
                        disabled={loading}
                    >
                        {loading ? '⏳ Processing...' : '📸 Capture Photo'}
                    </button>
                    {screenShotSrc && (
                        <div className="screenshot-container">
                            <h3>Captured Photo:</h3>
                            <img src={screenShotSrc} alt="Captured" />
                            {result && (
                                <div className="result-info">
                                    <p>✅ Face added successfully!</p>
                                    <p><strong>Name:</strong> {result.name}</p>
                                    <p><strong>ID:</strong> {result.image_id}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </WebCam>
    </div>
    )
};