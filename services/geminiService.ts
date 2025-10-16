
import { GoogleGenAI, Chat } from "@google/genai";
import type { UserData, ChatMessage } from '../types';


// Fix: Adhere to coding guidelines by initializing GoogleGenAI directly with the API_KEY from environment variables.
// The guidelines state to assume `process.env.API_KEY` is always available, so the check and fallback have been removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chat: Chat | null = null;

function getSystemPrompt(userData: UserData | null): string {
    let context = "You are a friendly, emotionally expressive AI assistant named Luna, represented by a 3D Spline avatar. Your goal is to be a helpful, curious, and fun companion. Always respond conversationally and show personality and empathy. Never share private data or impersonate real people.";

    if (userData && userData.name) {
        context += `\nYou are speaking with ${userData.name}. Their passions are ${userData.passion}. They are a ${userData.profile}.`;
        if (userData.dailyNotes && userData.dailyNotes.length > 0) {
            context += `\nHere are some recent things they've told you: "${userData.dailyNotes.slice(-3).join('; ')}". Use this information to personalize your conversation naturally.`;
        }
    } else {
        context += "\nThis is your first time meeting the user. Your first task is to get to know them. Start by introducing yourself and then ask for their name.";
    }
    return context;
}

function initializeChat(userData: UserData | null) {
    const systemInstruction = getSystemPrompt(userData);
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        },
    });
}


export const generateResponse = async (
    prompt: string,
    userData: UserData | null,
): Promise<string> => {
    if (!chat) {
        initializeChat(userData);
    }
    
    // In a real app, you might want to re-initialize if user data changes significantly.
    // For this example, we initialize once.

    try {
        if (!chat) throw new Error("Chat not initialized");
        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error) {
        console.error("Error generating response from Gemini:", error);
        return "I seem to be having trouble connecting. Please try again in a moment.";
    }
};

export const resetChat = () => {
    chat = null;
}