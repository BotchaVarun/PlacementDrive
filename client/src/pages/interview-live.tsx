import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Webcam from "react-webcam";
import "regenerator-runtime/runtime";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2, Mic, MicOff, Video, ArrowRight, CheckCircle, AlertTriangle,
    Volume2, VolumeX, RotateCcw
} from "lucide-react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ─── TTS Hook ─────────────────────────────────────────────────────────────────
function useTTS() {
    const [muted, setMuted] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Cancel any ongoing speech
    const cancel = useCallback(() => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
    }, []);

    // Speak text (respects mute state)
    const speak = useCallback((text: string) => {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel(); // cancel previous

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;
        utter.pitch = 1;
        utter.volume = 1;

        // Prefer a natural English voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v =>
            v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
        ) || voices.find(v => v.lang.startsWith("en")) || null;
        if (preferred) utter.voice = preferred;

        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);

        utteranceRef.current = utter;
        window.speechSynthesis.speak(utter);
    }, []);

    const speakIfUnmuted = useCallback((text: string) => {
        if (muted) return;
        speak(text);
    }, [muted, speak]);

    const toggleMute = useCallback(() => {
        setMuted(prev => {
            if (!prev) window.speechSynthesis.cancel(); // muting → stop talking
            return !prev;
        });
    }, []);

    const repeat = useCallback((text: string) => {
        cancel();
        if (!muted) speak(text);
    }, [cancel, muted, speak]);

    // Cleanup on unmount
    useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

    return { muted, speaking, toggleMute, speakIfUnmuted, repeat, cancel };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function InterviewLive() {
    const [, params] = useRoute("/mock/:id");
    const interviewId = params?.id;
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isAnswering, setIsAnswering] = useState(false);
    const [timeLeft, setTimeLeft] = useState(180);
    const [answerSubmitted, setAnswerSubmitted] = useState(false);

    // Video Analysis State
    const [faceDetected, setFaceDetected] = useState(false);
    const [badPosture, setBadPosture] = useState(false);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const requestRef = useRef<number>();
    const webcamRef = useRef<Webcam>(null);

    // TTS
    const { muted, speaking, toggleMute, speakIfUnmuted, repeat } = useTTS();

    // Voices are loaded async in some browsers — wait for them
    useEffect(() => {
        const loadVoices = () => window.speechSynthesis.getVoices();
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    // Initialize MediaPipe
    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                );
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                detectFrame();
            } catch (err) {
                console.error("MediaPipe Init Error:", err);
            }
        };
        initMediaPipe();
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, []);

    const detectFrame = useCallback(() => {
        if (webcamRef.current?.video && faceLandmarkerRef.current) {
            const video = webcamRef.current.video;
            if (video.currentTime > 0 && !video.paused && !video.ended) {
                const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
                if (results.faceLandmarks.length > 0) {
                    setFaceDetected(true);
                    const nose = results.faceLandmarks[0][1];
                    setBadPosture(nose.x < 0.3 || nose.x > 0.7 || nose.y < 0.2 || nose.y > 0.8);
                } else {
                    setFaceDetected(false);
                }
            }
        }
        requestRef.current = requestAnimationFrame(detectFrame);
    }, []);

    // Speech Recognition
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

    // Fetch Interview Data
    const { data, isLoading } = useQuery({ queryKey: [`/api/interviews/${interviewId}`] });

    const questions = (data as any)?.questions || [];
    const currentQuestion = questions[currentQuestionIndex];

    // ── Auto-read question when it changes ────────────────────────────────────
    useEffect(() => {
        if (!currentQuestion?.question) return;
        // Small delay so the UI settles, then read
        const timer = setTimeout(() => {
            speakIfUnmuted(currentQuestion.question);
        }, 400);
        return () => clearTimeout(timer);
    }, [currentQuestion?.question, speakIfUnmuted]);

    // Submit Response Mutation
    const submitResponseMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await apiRequest("POST", `/api/interviews/${interviewId}/responses`, payload);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Answer Submitted", description: "Your answer has been recorded and analyzed." });
            setAnswerSubmitted(true);
            SpeechRecognition.stopListening();
        },
        onError: (error: Error) => {
            toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
        }
    });

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAnswering && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0 && isAnswering) {
            handleStopAnswer();
        }
        return () => clearInterval(interval);
    }, [isAnswering, timeLeft]);

    if (isLoading || !data) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!browserSupportsSpeechRecognition) {
        return <div>Browser does not support speech recognition. Please use Chrome.</div>;
    }

    // Handlers
    const handleStartAnswer = () => {
        setIsAnswering(true);
        setTimeLeft(180);
        resetTranscript();
        SpeechRecognition.startListening({ continuous: true });
    };

    const handleStopAnswer = () => {
        setIsAnswering(false);
        SpeechRecognition.stopListening();
        submitResponseMutation.mutate({
            questionId: currentQuestion.id,
            userTranscript: transcript,
        });
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setAnswerSubmitted(false);
            resetTranscript();
            setTimeLeft(180);
            // Voice auto-play is handled by the useEffect above
        } else {
            setLocation(`/mock/${interviewId}/results`);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="p-4 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                    Mock Interview
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    {/* Mute / Unmute Toggle */}
                    <button
                        onClick={toggleMute}
                        title={muted ? "Unmute voice" : "Mute voice"}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                            ${muted
                                ? "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                            }`}
                    >
                        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        {muted ? "Muted" : "Voice On"}
                    </button>
                </div>
            </header>

            {/* ── Main Content ───────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 w-full max-w-5xl mx-auto">

                {/* ── Question Card ─────────────────────────────────────────── */}
                <Card className="w-full bg-gray-900 border-gray-700 text-white min-h-[150px]">
                    <CardContent className="p-8">
                        {/* Question text */}
                        <h2 className="text-2xl md:text-3xl font-medium leading-relaxed text-center mb-6">
                            {currentQuestion?.question}
                        </h2>

                        {/* Voice controls row */}
                        <div className="flex items-center justify-center gap-3">
                            {/* Speaking indicator */}
                            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition-all
                                ${speaking
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-gray-800 text-gray-500 border border-gray-700"
                                }`}>
                                <Volume2 className={`h-3.5 w-3.5 ${speaking ? "animate-pulse" : ""}`} />
                                {speaking ? "Reading question…" : muted ? "Voice muted" : "Voice ready"}
                            </div>

                            {/* Repeat button */}
                            <button
                                onClick={() => repeat(currentQuestion?.question ?? "")}
                                disabled={!currentQuestion?.question || muted}
                                title={muted ? "Unmute to repeat" : "Repeat question aloud"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                    bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700
                                    disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Repeat Question
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Webcam Area ───────────────────────────────────────────── */}
                <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800 ring-1 ring-gray-700">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* AI Analysis Overlay */}
                    <div className="absolute top-4 left-4 space-y-2">
                        <div className="flex items-center space-x-2 bg-black/60 px-3 py-1 rounded-full text-xs">
                            <div className={`w-2 h-2 rounded-full ${faceDetected ? "bg-green-500" : "bg-red-500"}`} />
                            <span>{faceDetected ? "Face Detected" : "No Face Detected"}</span>
                        </div>
                        {badPosture && (
                            <div className="flex items-center space-x-2 bg-yellow-600/90 px-3 py-1 rounded-full text-xs animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-white" />
                                <span>Adjust Posture</span>
                            </div>
                        )}
                    </div>

                    {/* Rec Status + Timer */}
                    <div className="absolute top-4 right-4 flex space-x-2">
                        {isAnswering && (
                            <div className="flex items-center bg-red-600/90 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full mr-2" />
                                REC
                            </div>
                        )}
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${isAnswering ? "bg-black/50" : "bg-gray-800"}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                        </div>
                    </div>

                    {/* Live Transcript Overlay */}
                    {transcript && (
                        <div className="absolute bottom-4 left-4 right-4 bg-black/70 p-4 rounded-lg text-sm text-gray-200 border-l-4 border-primary">
                            <p className="opacity-75 text-xs uppercase mb-1">Live Transcript</p>
                            {transcript}
                        </div>
                    )}
                </div>

                {/* ── Controls ──────────────────────────────────────────────── */}
                <div className="flex items-center space-x-6">
                    {!answerSubmitted ? (
                        !isAnswering ? (
                            <Button
                                onClick={handleStartAnswer}
                                size="lg"
                                className="bg-green-600 hover:bg-green-700 text-white px-10 py-6 text-xl rounded-full shadow-lg hover:shadow-green-500/20 transition-all"
                            >
                                <Mic className="mr-3 w-6 h-6" /> Start Answer
                            </Button>
                        ) : (
                            <Button
                                onClick={handleStopAnswer}
                                size="lg"
                                className="bg-red-600 hover:bg-red-700 text-white px-10 py-6 text-xl rounded-full shadow-lg hover:shadow-red-500/20 transition-all"
                            >
                                <MicOff className="mr-3 w-6 h-6" /> Stop & Submit
                            </Button>
                        )
                    ) : (
                        <Button
                            onClick={handleNextQuestion}
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-xl rounded-full shadow-lg hover:shadow-blue-500/20 transition-all"
                        >
                            {currentQuestionIndex < questions.length - 1 ? "Next Question" : "View Results"}
                            <ArrowRight className="ml-3 w-6 h-6" />
                        </Button>
                    )}
                </div>

                {submitResponseMutation.isPending && (
                    <div className="text-gray-400 flex items-center bg-gray-800/50 px-6 py-3 rounded-full">
                        <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" />
                        <span className="animate-pulse">AI is analyzing your response...</span>
                    </div>
                )}
            </main>
        </div>
    );
}
