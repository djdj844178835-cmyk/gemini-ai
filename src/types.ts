export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // base64
  url: string;  // data URL
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
