import { useState, useEffect, useRef, useCallback } from 'react';
import type jsQRType from 'jsqr';
import { useCamera, CameraConfig } from '../camera/useCamera';

// jsQR is bundled (lazy-loaded chunk), never fetched from a third-party CDN:
// any script on this origin can act with the user's Internet Identity session.
let jsQR: typeof jsQRType | null = null;

export interface QRResult {
    data: string;
    timestamp: number;
}

export interface QRScannerConfig extends CameraConfig {
    scanInterval?: number;
    maxResults?: number;
}

export const useQRScanner = (config: QRScannerConfig) => {
    const {
        scanInterval = 100,
        maxResults = 10,
        ...cameraConfig
    } = config;

    const [qrResults, setQrResults] = useState<QRResult[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [jsQRLoaded, setJsQRLoaded] = useState(false);

    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastScanRef = useRef<string>('');
    const isMountedRef = useRef(true);

    const camera = useCamera(cameraConfig);

    useEffect(() => {
        if (jsQR) {
            setJsQRLoaded(true);
            return;
        }
        import('jsqr')
            .then((mod) => {
                jsQR = mod.default;
                if (isMountedRef.current) {
                    setJsQRLoaded(true);
                }
            })
            .catch(() => console.error('Failed to load jsQR library'));
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
    }, []);

    const scanQRCode = useCallback(() => {
        if (!camera.videoRef.current || !camera.canvasRef.current || !jsQRLoaded || !jsQR) {
            return;
        }
        const video = camera.videoRef.current;
        const canvas = camera.canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data && code.data !== lastScanRef.current) {
            lastScanRef.current = code.data;
            const newResult: QRResult = {
                data: code.data,
                timestamp: Date.now()
            };
            if (isMountedRef.current) {
                setQrResults((prev) => [newResult, ...prev.slice(0, maxResults - 1)]);
            }
        }
    }, [camera.videoRef, camera.canvasRef, jsQRLoaded, maxResults]);

    useEffect(() => {
        if (isScanning && camera.isActive && jsQRLoaded) {
            scanIntervalRef.current = setInterval(scanQRCode, scanInterval);
        } else {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
            }
        }
        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
    }, [isScanning, camera.isActive, jsQRLoaded, scanQRCode, scanInterval]);

    const startScanning = useCallback(async (): Promise<boolean> => {
        if (!camera.isActive) {
            const success = await camera.startCamera();
            if (success) {
                setIsScanning(true);
                return true;
            }
            return false;
        } else {
            setIsScanning(true);
            return true;
        }
    }, [camera.isActive, camera.startCamera]);

    const stopScanning = useCallback(async (): Promise<void> => {
        setIsScanning(false);
        await camera.stopCamera();
        lastScanRef.current = '';
    }, [camera.stopCamera]);

    const switchCamera = useCallback(async (): Promise<boolean> => {
        const success = await camera.switchCamera();
        if (success && isScanning) {
            lastScanRef.current = '';
        }
        return success;
    }, [camera.switchCamera, isScanning]);

    const clearResults = useCallback(() => {
        setQrResults([]);
        lastScanRef.current = '';
    }, []);

    const reset = useCallback(() => {
        setIsScanning(false);
        clearResults();
    }, [clearResults]);

    return {
        // QR Scanner state
        qrResults,
        isScanning,
        jsQRLoaded,

        // Camera state (pass-through)
        isActive: camera.isActive,
        isSupported: camera.isSupported,
        error: camera.error,
        isLoading: camera.isLoading,
        currentFacingMode: camera.currentFacingMode,

        // Actions
        startScanning,
        stopScanning,
        switchCamera,
        clearResults,
        reset,
        retry: camera.retry,

        // Refs for components
        videoRef: camera.videoRef,
        canvasRef: camera.canvasRef,

        // Computed state
        isReady: jsQRLoaded && camera.isSupported !== false,
        canStartScanning: jsQRLoaded && camera.isSupported === true && !camera.isLoading
    };
};
