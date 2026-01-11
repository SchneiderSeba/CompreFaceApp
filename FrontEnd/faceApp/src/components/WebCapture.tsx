import WebCam from "react-webcam";
import './WebCapture.css';
import { useState, useRef, useCallback } from "react";
import axios from "axios";
import type { CaptureResponse, RecognitionResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

export const WebCapture: React.FC = () => {
    const webcamRef = useRef<WebCam>(null);
    const [screenShotSrc, setScreenshotSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultManually, setResultManually] = useState<CaptureResponse | null>(null);
    const [resultRecognize, setResultRecognize] = useState<RecognitionResponse | null>(null);
    const [captureMode, setCaptureMode] = useState<'new' | 'recognize'>('recognize');

    const getErrorMessage = useCallback((error: unknown) => {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.error || error.message || 'Error al procesar la imagen';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Error al procesar la imagen';
    }, []);

    const handleCaptureNew = useCallback(async (screenshot: string) => {
        setScreenshotSrc(screenshot);
        setLoading(true);
        
        try {
            const response = await axios.post<CaptureResponse>(`${API_URL}/capture`, {
                image: screenshot,
                name: 'Sebastian'
            });
            
            console.log('Face added:', response.data);
            setResultManually(response.data);
            setResultRecognize(null);
        } catch (error: unknown) {
            console.error('Error uploading image:', error);
            alert(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [getErrorMessage]);

    const handleCaptureRecognize = useCallback(async (screenshot: string) => {
        setScreenshotSrc(screenshot);
        setLoading(true);
        try {
            const response = await axios.post<RecognitionResponse>(`${API_URL}/recognize`, {
                image: screenshot
            });
            console.log('Recognition result:', response.data);
            setResultRecognize(response.data);
            setResultManually(null);
        } catch (error: unknown) {
            console.error('Error recognizing image:', error);
            alert(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [getErrorMessage]);

    const capture = useCallback(() => {
        const screenshot = webcamRef.current?.getScreenshot();
        if (screenshot && captureMode === 'new') {
            handleCaptureNew(screenshot);
        } else if (screenshot && captureMode === 'recognize') {
            handleCaptureRecognize(screenshot);
        } else {
            alert('Error capturing image');
        }
    }, [captureMode, handleCaptureNew, handleCaptureRecognize]);

    return (
        <div className="webcam-container"> 
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
            <button 
                onClick={capture} 
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
    );
};