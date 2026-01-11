import WebCam from "react-webcam";
import './WebCaptureV2.css';
import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { ReflectiveCard } from "./ReflectiveCard";
import { CountUp } from "./CountUp";

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

export const WebCaptureV2: React.FC = () => {
    const webcamRef = useRef<WebCam>(null);
    const [screenShotSrc, setScreenshotSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultManually, setResultManually] = useState<any>(null);
    const [resultRecognize, setResultRecognize] = useState<any>(null);
    const [captureMode, setCaptureMode] = useState<'new' | 'recognize'>('recognize');

    const capture = useCallback(() => {
        const screenshot = webcamRef.current?.getScreenshot();
        if (screenshot && captureMode === 'new') {
            handleCaptureNew(screenshot);
        } else if (screenshot && captureMode === 'recognize') {
            handeCaptureRecognize(screenshot);
        } else {
            alert('Error capturing image');
        }
    }, [captureMode]);

    const handleCaptureNew = async (screenshot: string) => {
        setScreenshotSrc(screenshot);
        setLoading(true);
        
        try {
            const response = await axios.post(`${API_URL}/capture`, {
                image: screenshot,
                name: 'Sebastian'
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
            <ReflectiveCard 
                blurStrength={16}
                metalness={0.9}
                roughness={0.6}
                className="webcam-card"
            >
                <WebCam 
                    ref={webcamRef}
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
                />
            </ReflectiveCard>

            <div className="controls-section">
                <div className="mode-selector">
                    <label className={captureMode === 'new' ? 'active' : ''}>
                        <input 
                            type="radio" 
                            name="captureMode" 
                            value="new"
                            checked={captureMode === 'new'}
                            onChange={() => setCaptureMode('new')}
                        />
                        <span>🆕 New Face</span>
                    </label>
                    <label className={captureMode === 'recognize' ? 'active' : ''}>
                        <input 
                            type="radio" 
                            name="captureMode" 
                            value="recognize"
                            checked={captureMode === 'recognize'}
                            onChange={() => setCaptureMode('recognize')}
                        />
                        <span>🔍 Recognize</span>
                    </label>
                </div>
                
                <button 
                    onClick={capture} 
                    className="capture-button"
                    disabled={loading}
                >
                    {loading ? '⏳ Processing...' : '📸 Capture Photo'}
                </button>
            </div>

            {screenShotSrc && (
                <ReflectiveCard className="result-card">
                    <div className="result-content">
                        <div className="captured-image-container">
                            <img src={screenShotSrc} alt="Captured" className="captured-image" />
                        </div>
                        
                        {resultManually ? (
                            <div className="result-info success">
                                <div className="result-header">
                                    <span className="result-icon">✅</span>
                                    <h3>Face Added Successfully!</h3>
                                </div>
                                <div className="result-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Name:</span>
                                        <span className="detail-value">{resultManually.name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">ID:</span>
                                        <span className="detail-value">{resultManually.image_id}</span>
                                    </div>
                                </div>
                            </div>
                        ) : resultRecognize?.result?.length ? (
                            <div className="result-info recognition">
                                <div className="result-header">
                                    <span className="result-icon">🎯</span>
                                    <h3>Recognition Results</h3>
                                </div>
                                <div className="result-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Subject:</span>
                                        <span className="detail-value highlight">
                                            {resultRecognize.result[0].subjects?.[0]?.subject ?? 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="detail-item metric">
                                        <span className="detail-label">Similarity:</span>
                                        <span className="detail-value percentage">
                                            <CountUp 
                                                to={resultRecognize.result[0].subjects?.[0]?.similarity ? resultRecognize.result[0].subjects[0].similarity * 100 : 0}
                                                from={0}
                                                duration={1.5}
                                                decimals={2}
                                                suffix="%"
                                                className="count-up-similarity"
                                            />
                                        </span>
                                    </div>
                                    <div className="detail-item metric">
                                        <span className="detail-label">Detection Probability:</span>
                                        <span className="detail-value percentage">
                                            <CountUp 
                                                to={resultRecognize.result[0].box?.probability ? resultRecognize.result[0].box.probability * 100 : 0}
                                                from={0}
                                                duration={1.5}
                                                decimals={2}
                                                suffix="%"
                                                className="count-up-probability"
                                            />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="result-info empty">
                                <div className="result-header">
                                    <span className="result-icon">❌</span>
                                    <h3>No Face Detected</h3>
                                </div>
                                <p className="empty-message">No recognition results found. Try again with better lighting.</p>
                            </div>
                        )}
                    </div>
                </ReflectiveCard>
            )}
        </div>
    );
};