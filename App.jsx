
import React, { useState, useEffect, useRef, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage';
import { generateResponse, resetChat } from './services/geminiService';
import Avatar from './components/Avatar';
import { MicIcon, MicOffIcon, CameraIcon, ScreenIcon, PauseIcon, PlayIcon, SparklesIcon, DataIcon, CloseIcon, SendIcon } from './components/icons';

const AIStateEnum = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  PAUSED: 'PAUSED',
  SLEEPING: 'SLEEPING',
};

// Web Speech API interfaces
// declare global {
//   interface Window {
//     SpeechRecognition: any;
//     webkitSpeechRecognition: any;
//   }
// }

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

const App = () => {
  const [userData, setUserData] = useLocalStorage('userData', null);
  const [aiState, setAiState] = useState(AIStateEnum.IDLE);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [isVideoPanelOpen, setIsVideoPanelOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const videoRef = useRef(null);
  const chatInputRef = useRef(null);

  const avatarRef = useRef(null);
  const onboardingStep = useRef(0);
  const tempUserData = useRef({});

  const processTranscript = useCallback(async (text) => {
    if (!text.trim()) return;

    setAiState(AIStateEnum.THINKING);

    // Add user message to chat
    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);

    if (!userData) {
        // Onboarding logic
        let response = '';
        switch(onboardingStep.current) {
            case 0: // Intro & ask for name
                response = `Nice to meet you, ${text}! What are you passionate about?`;
                tempUserData.current.name = text;
                onboardingStep.current = 1;
                break;
            case 1: // Ask for passion
                response = `That's fascinating! So, are you a student or a working professional?`;
                tempUserData.current.passion = text;
                onboardingStep.current = 2;
                break;
            case 2: // Ask for profile
                response = `Got it. One last thing for today, what's something you worked on recently?`;
                tempUserData.current.profile = text;
                onboardingStep.current = 3;
                break;
            case 3: // Ask for recent work & complete
                response = `Thanks for sharing! I'll remember that. It was great getting to know you. How can I help you today?`;
                tempUserData.current.dailyNotes = [text];
                setUserData(tempUserData.current);
                onboardingStep.current = 4; // Done
                break;
        }
        speak(response);
        setCurrentResponse(response);
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: response, timestamp: new Date() };
        setChatMessages(prev => [...prev, aiMessage]);
    } else {
        // Regular conversation
        const response = await generateResponse(text, userData);
        if (userData && !userData.dailyNotes.includes(text)) {
           const updatedUserData = { ...userData, dailyNotes: [...userData.dailyNotes, text]};
           setUserData(updatedUserData);
        }
        speak(response);
        setCurrentResponse(response);
        // Add AI response to chat
        const aiMessage = { role: 'assistant', content: response, timestamp: new Date() };
        setChatMessages(prev => [...prev, aiMessage]);
    }
  }, [userData, setUserData]);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    setAiState(AIStateEnum.SPEAKING);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      setAiState(isMuted ? AIStateEnum.SLEEPING : AIStateEnum.IDLE);
      if(!isMuted) startListening();
    };
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setAiState(isMuted ? AIStateEnum.SLEEPING : AIStateEnum.IDLE);
    }
    window.speechSynthesis.speak(utterance);
  };

  const startListening = useCallback(async () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome for voice input.");
      return;
    }
    if (isMuted) return;

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      window.speechSynthesis.cancel();
      setAiState(AIStateEnum.LISTENING);
      recognition.start();
    } catch(e) {
      console.error("Recognition start error", e);
      if (e.name === 'NotAllowedError') {
        alert("Microphone permission denied. Please allow microphone access to use voice input.");
      } else {
        alert("Error accessing microphone. Please check your browser settings.");
      }
      setIsMuted(true);
    }
  }, [isMuted]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    setAiState(AIStateEnum.IDLE);
    recognition.stop();
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(interimTranscript);
      if (finalTranscript) {
        setTranscript('');
        processTranscript(finalTranscript);
        stopListening();
      }
    };

    recognition.onend = () => {
        if (aiState === AIStateEnum.LISTENING) {
           // Restart if it stops unexpectedly
           startListening();
        }
    };

    return () => {
        recognition.onresult = null;
        recognition.onend = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processTranscript, stopListening, startListening, aiState]);

  // Removed the useEffect that was conflicting with handleMuteToggle


  useEffect(() => {
    if (!userData) {
      speak("Hi! I’m Luna, your new AI companion. To get started, what should I call you?");
      onboardingStep.current = 0;
    } else {
       const today = new Date().toDateString();
       const lastLogin = localStorage.getItem('lastLogin');
       if(lastLogin !== today) {
         speak(`Hey ${userData.name}! Good to see you again. How was your day today?`);
       }
       localStorage.setItem('lastLogin', today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.name]);


  const handleMuteToggle = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (newMutedState) {
      stopListening();
      window.speechSynthesis.cancel();
      setAiState(AIStateEnum.SLEEPING);
    } else {
      await startListening();
    }
  };
  const handlePauseToggle = () => setAiState(prev => prev === AIStateEnum.PAUSED ? AIStateEnum.IDLE : AIStateEnum.PAUSED);

  const handlePose = () => avatarRef.current?.triggerPose('HappyAnimation');
  
  const handleMemoryClear = () => {
      if(window.confirm("Are you sure you want to clear your data? This cannot be undone.")){
          setUserData(null);
          resetChat();
          setChatMessages([]);
          onboardingStep.current = 0;
          setIsMemoryPanelOpen(false);
          // A reload helps to reset everything cleanly
          window.location.reload();
      }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    await processTranscript(text);
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMemoryExport = () => {
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = 'ai_assistant_data.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  }
  
  const startMedia = async (type) => {
    try {
        const stream = type === 'camera'
            ? await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            : await navigator.mediaDevices.getDisplayMedia({ video: true });
        setMediaStream(stream);
        setIsVideoPanelOpen(true);
    } catch (err) {
        console.error(`Error accessing ${type}:`, err);
        alert(`Could not access ${type}. Please check permissions.`);
    }
  };

  const stopMedia = () => {
      if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
      }
      setMediaStream(null);
      setIsVideoPanelOpen(false);
  }

  useEffect(() => {
      if (mediaStream && videoRef.current) {
          videoRef.current.srcObject = mediaStream;
      }
  }, [mediaStream]);


  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <Avatar ref={avatarRef} aiState={aiState} />
      </div>

      <div className="absolute top-4 left-4 z-10">
        <img src="/Picsart_25-10-06_14-25-42-374.png" alt="Logo" className="w-12 h-12 rounded-full" />
      </div>

      {currentResponse && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <h6 className="text-white text-xl font-bold text-center">{currentResponse}</h6>
        </div>
      )}

      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button onClick={() => setIsChatPanelOpen(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          💬
        </button>
        <button onClick={() => setIsMemoryPanelOpen(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <DataIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col items-center">
        <div className="h-12 text-center text-lg text-gray-300 italic">
          {aiState === AIStateEnum.LISTENING && transcript}
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => startMedia('camera')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><CameraIcon className="w-7 h-7" /></button>
            <button onClick={() => startMedia('screen')} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><ScreenIcon className="w-7 h-7" /></button>
            
            <button onClick={handleMuteToggle} className={`p-5 rounded-full transition-all duration-300 ${!isMuted ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-green-500'}`}>
                {isMuted ? <MicOffIcon className="w-10 h-10"/> : <MicIcon className="w-10 h-10"/>}
            </button>
            
            <button onClick={handlePauseToggle} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                {aiState === AIStateEnum.PAUSED ? <PlayIcon className="w-7 h-7" /> : <PauseIcon className="w-7 h-7" />}
            </button>
            <button onClick={handlePose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><SparklesIcon className="w-7 h-7" /></button>
        </div>
        <p className="text-gray-400 mt-2 text-sm">
            {isMuted ? "Click the mic to start" : "Listening..."}
        </p>
      </div>

      {/* Memory Panel */}
      {isMemoryPanelOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">My Memory</h2>
                    <button onClick={() => setIsMemoryPanelOpen(false)}><CloseIcon className="w-6 h-6"/></button>
                </div>
                {userData ? (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-purple-300">Profile</h3>
                            <p><strong>Name:</strong> {userData.name}</p>
                            <p><strong>Passion:</strong> {userData.passion}</p>
                            <p><strong>Role:</strong> {userData.profile}</p>
                        </div>
                        <div>
                             <h3 className="text-lg font-semibold text-purple-300">Recent Notes</h3>
                             <ul className="list-disc list-inside bg-gray-900 p-3 rounded-md">
                                {userData.dailyNotes.slice(-10).map((note, i) => <li key={i}>{note}</li>)}
                             </ul>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-gray-700">
                             <button onClick={handleMemoryExport} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors">Export Data</button>
                             <button onClick={handleMemoryClear} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md transition-colors">Clear Memory</button>
                        </div>
                    </div>
                ) : <p>No data stored yet. Start a conversation to build your profile!</p>}
            </div>
        </div>
      )}
      
      {/* Video Panel */}
      {isVideoPanelOpen && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
               <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl relative">
                    <button onClick={stopMedia} className="absolute top-2 right-2 p-1 bg-white/20 rounded-full"><CloseIcon className="w-6 h-6"/></button>
                    <video ref={videoRef} autoPlay playsInline className="w-full rounded-md"></video>
               </div>
          </div>
      )}

      {/* Chat Panel */}
      {isChatPanelOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl h-[80vh] flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Chat History</h2>
              <button onClick={() => setIsChatPanelOpen(false)}><CloseIcon className="w-6 h-6"/></button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {chatMessages.length === 0 ? (
                <p className="text-gray-400 text-center">No messages yet. Start a conversation!</p>
              ) : (
                chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
