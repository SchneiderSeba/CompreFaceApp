import WebCam from "react-webcam";
import './WebCaptureV2.css';
import { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { ReflectiveCard } from "./ReflectiveCard";
import CountUp from "./CountUp";
import type { CaptureResponse, RecognitionResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL || 'https://comprefaceapp-production-a8a0.up.railway.app';

interface WebCaptureV2Props {
    canManagePeople: boolean;
    onUnauthorized: () => void;
    onRecognized: (recognition: RecognitionResponse) => void;
}

export const WebCaptureV2: React.FC<WebCaptureV2Props> = ({ canManagePeople, onUnauthorized, onRecognized }) => {
    const webcamRef = useRef<WebCam>(null);
    const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultManually, setResultManually] = useState<CaptureResponse | null>(null);
    const [newFaceName, setNewFaceName] = useState<string>('');
    const [employeeCode, setEmployeeCode] = useState<string>('');
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
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    }, [releaseCameraStream]);

    useEffect(() => {
        if (!canManagePeople && captureMode === 'new') setCaptureMode('recognize');
    }, [canManagePeople, captureMode]);

    const getErrorMessage = useCallback((error: unknown) => {
        if (axios.isAxiosError(error)) {
            return error.response?.data?.error || error.message || 'Error al procesar la imagen';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Error al procesar la imagen';
    }, []);

    const handleCaptureNew = useCallback(async (screenshot: string, newFaceName: string, code: string) => {
        setLoading(true);
        try {
            const response = await axios.post<CaptureResponse>(`${API_URL}/capture`, {
                image: screenshot,
                name: newFaceName,
                employeeCode: code
            }, { withCredentials: true });
            setResultManually(response.data);
            setResultRecognize(null);
            setNewFaceName('');
            setEmployeeCode('');
        } catch (error: unknown) {
            console.error('Error uploading image:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) onUnauthorized();
            alert(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [getErrorMessage, onUnauthorized]);

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
            if (response.data.matchedEmployee && response.data.checkIn) {
                if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
                redirectTimerRef.current = setTimeout(() => {
                    releaseCameraStream();
                    onRecognized(response.data);
                }, 2000);
            } else {
                setRecognizeError('El rostro no corresponde a un empleado registrado.');
            }
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
    }, [getErrorMessage, onRecognized, releaseCameraStream]);

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
            handleCaptureNew(screenshot, newFaceName, employeeCode);
        } else if (screenshot && captureMode === 'recognize') {
            handleCaptureRecognize(screenshot);
        } else {
            alert('Error capturing image');
        }
    }, [cameraReady, captureMode, employeeCode, handleCaptureNew, handleCaptureRecognize, newFaceName]);

    return (
        <div className="webcam-container">
            <ReflectiveCard 
                blurStrength={16}
                metalness={0.9}
                roughness={0.6}
                className={`webcam-card ${recognitionResult ? 'glow-active' : ''}`}
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
                            <div className="result-details">
                                <h3>Face Added</h3>
                                <p className="result-label">{resultManually.name}</p>
                                <p className="result-sub">Legajo: {resultManually.employeeCode}</p>
                            </div>
                        ) : null}
                    </div>
                    <div>
                        {recognitionResult ? (
                            <>
                                <p className="result-title">Recognition Results</p>
                                <p className="result-label">
                                    {recognitionResult?.subjects?.[0]?.displayName ?? recognitionResult?.subjects?.[0]?.subject ?? 'Unknown'}
                                </p>
                                {recognitionResult?.subjects?.[0]?.employeeCode && (
                                    <p className="result-sub">Legajo: {recognitionResult.subjects[0].employeeCode}</p>
                                )}
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
                            <p className={`result-placeholder ${recognizeError || newFaceName !== '' ? 'disable' : ''}`}>Press "Recognize" & "Capture Photo" to Clock-In.</p>
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
                    {canManagePeople && (
                        <label className={captureMode === 'new' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="captureMode"
                                value="new"
                                checked={captureMode === 'new'}
                                onChange={() => setCaptureMode('new')}
                            />
                            <span>➕ Alta con cámara</span>
                        </label>
                    )}
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

                {captureMode === 'new' ? (
                    <div className="new-face-fields">
                        <input
                            type="text"
                            placeholder="Nombre completo"
                            className="input-new-face"
                            value={newFaceName}
                            onChange={(e) => setNewFaceName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Legajo (ej. EMP-001)"
                            className="input-new-face"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                        />
                    </div>
                ) : (
                    <p className="mode-description">Reconoce una cara existente en la base de datos.</p>
                )
                }
                
                <button 
                    onClick={capture} 
                    className="capture-button"
                    disabled={loading || !!cameraError || (captureMode === 'new' && (!newFaceName.trim() || !employeeCode.trim()))}
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
