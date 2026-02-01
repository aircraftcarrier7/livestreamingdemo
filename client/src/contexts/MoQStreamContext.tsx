import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
// import { Client } from "@moq/lite"; // Placeholder for the library

interface MoQStreamContextType {
    isStreaming: boolean;
    startStream: (url: string) => Promise<void>;
    stopStream: () => void;
    error: string | null;
}

const MoQStreamContext = createContext<MoQStreamContextType | null>(null);

export function MoQStreamProvider({ children }: { children: React.ReactNode }) {
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const transportRef = useRef<any>(null); // WebTransport
    const videoEncoderRef = useRef<VideoEncoder | null>(null);
    const streamWriterRef = useRef<WritableStreamDefaultWriter | null>(null);

    const stopStream = useCallback(() => {
        console.log("Stopping MoQ Stream...");
        setIsStreaming(false);

        if (videoEncoderRef.current) {
            videoEncoderRef.current.close();
            videoEncoderRef.current = null;
        }

        if (transportRef.current) {
            transportRef.current.close();
            transportRef.current = null;
        }

        if (streamWriterRef.current) {
            streamWriterRef.current.close().catch(console.error);
            streamWriterRef.current = null;
        }
    }, []);

    const startStream = useCallback(async (url: string) => {
        try {
            setError(null);
            console.log(`Starting MoQ Stream to ${url}...`);

            // 1. Initialize WebTransport
            // Note: 'WebTransport' is a global API in modern browsers (Chrome 97+)
            if (typeof WebTransport === 'undefined') {
                throw new Error("WebTransport is not supported in this browser.");
            }

            const transport = new WebTransport(url);
            await transport.ready;
            transportRef.current = transport;
            console.log("WebTransport connected");

            // 2. Open a Unidirectional Stream for Media Data
            const stream = await transport.createUnidirectionalStream();
            const writer = stream.getWriter();
            streamWriterRef.current = writer;

            // 3. Initialize WebCodecs (VideoEncoder)
            const init: VideoEncoderInit = {
                output: (chunk, metadata) => {
                    // Packetize and send
                    // Simple framing: [Size (4 bytes)][Data]
                    const data = new Uint8Array(chunk.byteLength + 4);
                    const view = new DataView(data.buffer);
                    view.setUint32(0, chunk.byteLength);
                    chunk.copyTo(new Uint8Array(data.buffer, 4));

                    if (streamWriterRef.current) {
                        streamWriterRef.current.write(data).catch(e => {
                            console.error("Write error:", e);
                            stopStream();
                        });
                    }
                },
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    setError(e.message);
                    stopStream();
                }
            };

            const config: VideoEncoderConfig = {
                codec: 'avc1.42001e', // H.264 Baseline Profile Level 3.0
                width: 1280,
                height: 720,
                bitrate: 2_000_000, // 2 Mbps
                framerate: 30,
            };

            const encoder = new VideoEncoder(init);
            encoder.configure(config);
            videoEncoderRef.current = encoder;
            console.log("VideoEncoder configured");

            // 4. Start Capturing Canvas/Video
            // This part assumes we have access to the canvas stream from the parent component or another context
            // For now, setting isStreaming to true will trigger the capture logic in the UI component

            setIsStreaming(true);

        } catch (e: any) {
            console.error("Failed to start stream:", e);
            setError(e.message);
            setIsStreaming(false);
        }
    }, [stopStream]);

    const value = {
        isStreaming,
        startStream,
        stopStream,
        error
    };

    return (
        <MoQStreamContext.Provider value={value}>
            {children}
        </MoQStreamContext.Provider>
    );
}

export function useMoQStream() {
    const context = useContext(MoQStreamContext);
    if (!context) {
        throw new Error("useMoQStream must be used within a MoQStreamProvider");
    }
    return context;
}
