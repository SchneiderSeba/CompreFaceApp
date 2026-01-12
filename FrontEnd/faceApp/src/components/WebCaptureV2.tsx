import WebCam from "react-webcam";
import './WebCaptureV2.css';
import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { ReflectiveCard } from "./ReflectiveCard";
import CountUp from "./CountUp";
import type { CaptureResponse, RecognitionResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

export const WebCaptureV2: React.FC = () => {
    const webcamRef = useRef<WebCam>(null);
    const [loading, setLoading] = useState(false);
    const [resultManually, setResultManually] = useState<CaptureResponse | null>(null);
    const [resultRecognize, setResultRecognize] = useState<RecognitionResponse | null>(null);
    const [recognizeError, setRecognizeError] = useState<string | null>(null);
    const [captureMode, setCaptureMode] = useState<'new' | 'recognize'>('recognize');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraKey, setCameraKey] = useState(0);

    const releaseCameraStream = useCallback(() => {
        const stream = webcamRef.current?.video?.srcObject;
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
    }, []);

    const retryCamera = useCallback(() => {
        releaseCameraStream();
        setCameraError(null);
        setCameraReady(false);
        setCameraKey((prev) => prev + 1);
    }, [releaseCameraStream]);

    useEffect(() => () => {
        releaseCameraStream();
    }, [releaseCameraStream]);

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
        setLoading(true);
        try {
            const response = await axios.post<RecognitionResponse>(`${API_URL}/recognize`, {
                image: screenshot
            });
            console.log('Recognition result:', response.data);
            setResultRecognize(response.data);
            setResultManually(null);
            setRecognizeError(null);
        } catch (error: unknown) {
            console.error('Error recognizing image:', error);
            setRecognizeError(getErrorMessage(error));
            const cleanTimer = setTimeout(() => {
                setRecognizeError(null);
            }, 2500);
            return () => clearTimeout(cleanTimer);
        } finally {
            setLoading(false);
        }
    }, [getErrorMessage]);

    const recognitionResult = resultRecognize?.result?.[0];
    const similarityPercent = recognitionResult?.subjects?.[0]?.similarity
        ? recognitionResult.subjects[0].similarity * 100
        : 0;
    const detectionPercent = recognitionResult?.box?.probability
        ? recognitionResult.box.probability * 100
        : 0;
    const isSimilarityHigh = similarityPercent > 85;
    const isDetectionHigh = detectionPercent > 85;

    const capture = useCallback(() => {
        if (!cameraReady) {
            alert('La cámara aún no está lista. Revisa los permisos del navegador.');
            return;
        }
        const screenshot = webcamRef.current?.getScreenshot();
        if (screenshot && captureMode === 'new') {
            handleCaptureNew(screenshot);
        } else if (screenshot && captureMode === 'recognize') {
            handleCaptureRecognize(screenshot);
        } else {
            alert('Error capturing image');
        }
    }, [cameraReady, captureMode, handleCaptureNew, handleCaptureRecognize]);

    return (
        <div className="webcam-container">
            <ReflectiveCard 
                blurStrength={16}
                metalness={0.9}
                roughness={0.6}
                className="webcam-card"
            >
                <WebCam 
                    key={cameraKey}
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
                    onUserMedia={() => {
                        setCameraReady(true);
                        setCameraError(null);
                    }}
                    onUserMediaError={(error) => {
                        console.error('Camera access error:', error);
                        releaseCameraStream();
                        let message = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
                        if (error instanceof DOMException) {
                            if (error.name === 'NotAllowedError') {
                                message = 'Acceso denegado. Permite el uso de la cámara (ícono del candado o Brave Shields).';
                            } else if (error.name === 'NotFoundError') {
                                message = 'No se detectó ninguna cámara disponible.';
                            } else if (error.name === 'NotReadableError') {
                                message = 'Brave bloqueó el stream (NotReadable). Cierra apps que usen la cámara y en Shields ajusta Fingerprinting → Allow all.';
                            }
                        }
                        setCameraError(message);
                        setCameraReady(false);
                    }}
                />

                <div >
                    <div className="result-panel-upper">
                        {resultManually ? (
                            <div className="result-info success">
                                <h3>Face Added</h3>
                                <p className="result-label">{resultManually.name}</p>
                                <p className="result-sub">ID: {resultManually.image_id}</p>
                            </div>
                        ) : null}
                    </div>
                    <div>
                        {recognitionResult ? (
                            <>
                                <p className="result-title">Recognition Results</p>
                                <p className="result-label">
                                    {recognitionResult.subjects?.[0]?.subject ?? 'Unknown'}
                                </p>
                                <div className="result-metrics">
                                    <div>
                                        <span className="metric-label">Similarity</span>
                                        <span className={`metric-value ${isSimilarityHigh ? 'metric-value--good' : ''}`}>
                                            <CountUp
                                                to={similarityPercent}
                                                from={0}
                                                duration={1}
                                                suffix="%"
                                                className="count-up-similarity"
                                            />
                                        </span>
                                    </div>
                                    <div>
                                        <span className="metric-label">Detection</span>
                                        <span className={`metric-value ${isDetectionHigh ? 'metric-value--good' : ''}`}>
                                            <CountUp
                                                to={detectionPercent}
                                                from={0}
                                                duration={1}
                                                suffix="%"
                                                className="count-up-probability"
                                            />
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className={`result-placeholder ${recognizeError ? 'disable' : ''}`}>Captura una foto y presiona "Recognize" para ver los datos aquí.</p>
                        )}

                        {recognizeError ? (
                            <div className="recognize-error">
                                <p>{recognizeError}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
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
                    disabled={loading || !!cameraError}
                >
                    {loading ? '⏳ Processing...' : '📸 Capture Photo'}
                </button>
                {cameraError && (
                    <div className="camera-error">
                        <p>
                            {cameraError}<br />
                            Brave: abre el escudo 🛡️ y permite "Fingerprinting"/"Camera" para este sitio.
                        </p>
                        <button type="button" className="retry-camera-button" onClick={retryCamera}>
                            🔄 Reintentar cámara
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};