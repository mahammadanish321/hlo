
export enum AIState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  PAUSED = 'PAUSED',
  SLEEPING = 'SLEEPING',
}

export interface UserData {
  name: string;
  passion: string;
  profile: string;
  dailyNotes: string[];
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  timestamp: Date;
}
