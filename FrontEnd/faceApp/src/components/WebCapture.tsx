import WebCam from "react-webcam";
import './WebCapture.css';
import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const WebCapture = () => {

const [screenShotSrc, setScreenshotSrc] = useState<string | null>(null);
const [loading, setLoading] = useState(false);
const [resultManually, setResultManually] = useState<any>(null);
const [resultRecognize, setResultRecognize] = useState<any>(null);
const [captureMode, setCaptureMode] = useState<'new' | 'recognize'>('recognize');

const handleCaptureNew = async (screenshot: string) => {
    setScreenshotSrc(screenshot);
    setLoading(true);
    
    try {
        const response = await axios.post(`${API_URL}/capture`, {
            image: screenshot,
            name: 'Sebastian' // Puedes hacer esto dinámico
        });
        
        console.log('Face added:', response.data);
        setResultManually(response.data);
        setResultRecognize(null);
    } catch (error: any) {
        console.error('Error uploading image:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Error al procesar la imagen';
        alert(errorMessage);
    } finally {
        setLoading(false);
    }
};

const handeCaptureRecognize = async (screenshot: string) => {
    setScreenshotSrc(screenshot);
    setLoading(true);
    try {
        const response = await axios.post(`${API_URL}/recognize`, {
            image: screenshot
        });
        console.log('Recognition result:', response.data);
        setResultRecognize(response.data);
        setResultManually(null);
    } catch (error: any) {
        console.error('Error recognizing image:', error);
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
                <div>
                    <button 
                        onClick={() => {
                            const screenShot = getScreenshot();
                            if (screenShot && captureMode === 'new') {
                                handleCaptureNew(screenShot);
                            } else if (screenShot && captureMode === 'recognize') {
                                handeCaptureRecognize(screenShot);
                            } else {
                                alert('Error capturing image');
                            }
                        }} 
                        className="capture-button"
                        disabled={loading}
                    >
                        {loading ? '⏳ Processing...' : '📸 Capture Pic'}
                    </button>
                    {screenShotSrc && (
                        <div className="screenshot-container">
                            <h3>Captured Photo:</h3>
                            <img src={screenShotSrc} alt="Captured" />
                            {resultManually ? (
                                <div className="result-info">
                                    <p>✅ Face added successfully!</p>
                                    <p><strong>Name:</strong> {resultManually.name}</p>
                                    <p><strong>ID:</strong> {resultManually.image_id}</p>
                                </div>
                            ) : resultRecognize?.result?.length ? (
                                <div>
                                    <h4>Recognition Results:</h4>
                                    <ul>
                                        <li><strong>Subject:</strong> {resultRecognize.result[0].subjects?.[0]?.subject ?? 'N/A'}</li>
                                        <li><strong>Similarity:</strong> {(resultRecognize.result[0].subjects?.[0]?.similarity ? resultRecognize.result[0].subjects[0].similarity * 100 : 0).toFixed(2)}%</li>
                                        <li><strong>Detection Probability:</strong> {(resultRecognize.result[0].box?.probability ? resultRecognize.result[0].box.probability * 100 : 0).toFixed(2)}%</li>
                                    </ul>
                                </div>
                            ) : (
                                <p>No recognition results found.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </WebCam>
        <div className="mode-selector">
            <label>
            <input 
                type="radio" 
                name="captureMode" 
                value="new"
                checked={captureMode === 'new'}
                onChange={() => setCaptureMode('new')}
            />
            New
            </label>
            <label>
            <input 
                type="radio" 
                name="captureMode" 
                value="recognize"
                checked={captureMode === 'recognize'}
                onChange={() => setCaptureMode('recognize')}
            />
            Recognize
            </label>
        </div>
    </div>
    )
};