
export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatar?: string; // base64 string
}

export enum MessageSender {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  image?: string; // base64 string for images sent by user
  file?: {
    name: string;
    type: string;
  };
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  expiresAt: number; // timestamp
}

export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number; // timestamp
  updatedAt?: number; // timestamp - for tracking when task was completed
}
