
import * as tts from '@mintplex-labs/piper-tts-web';

// Using a high-quality, expressive US English voice
// Hugging Face model link: https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx
const VOICE_MODEL_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx';
const VOICE_CONFIG_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx.json';

let piperInstance: any = null;
let isInitializing = false;

interface PiperConfig {
    onInit?: () => void;
    onError?: (err: any) => void;
    onDownloadProgress?: (percent: number) => void;
}

export const initPiper = async (config?: PiperConfig) => {
    if (piperInstance) return piperInstance;
    if (isInitializing) {
        // Simple polling wait if already initializing
        while (isInitializing) {
            await new Promise(r => setTimeout(r, 100));
        }
        return piperInstance;
    }

    isInitializing = true;
    try {
        console.log("Initializing Piper TTS...");

        // Custom progress callback for model download
        const handleProgress = (progress: any) => {
            if (config?.onDownloadProgress && progress.total) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                config.onDownloadProgress(percent);
            }
        };

        // Initialize the TTS engine with the specific model
        // NOTE: This library handles the worker creation and ONNX runtime internally
        piperInstance = await new (tts as any).PiperTTS({
            model: VOICE_MODEL_URL,
            config: VOICE_CONFIG_URL,
            progress: handleProgress
        });

        console.log("Piper TTS Initialized");
        if (config?.onInit) config.onInit();
        return piperInstance;

    } catch (error) {
        console.error("Failed to initialize Piper TTS:", error);
        if (config?.onError) config.onError(error);
        throw error;
    } finally {
        isInitializing = false;
    }
};

export const speakWithPiper = async (text: string, onStart?: () => void, onEnd?: () => void) => {
    if (!piperInstance) {
        throw new Error("Piper not initialized. Call initPiper() first.");
    }

    try {
        if (onStart) onStart();

        // This returns an AudioBuffer or plays it directly depending on config
        // The library defaults to playing immediately using Web Audio API
        await piperInstance.speak({
            text: text,
            // Optional: can pass callback for when audio finishes
            onEnd: onEnd
        });

    } catch (error) {
        console.error("Piper TTS speak error:", error);
        if (onEnd) onEnd(); // Ensure cleanup happens
        throw error;
    }
};

export const hasPiperModel = async (): Promise<boolean> => {
    // Check if model is cached (this is heuristic as the library handles OPFS)
    // For now, we assume if initPiper is fast, it's cached.
    // Real check would require inspecting OPFS which is complex from main thread.
    return !!piperInstance;
};
