import { Profile } from './profile';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  is_group: boolean;
  created_by: string;
  name?: string;
  created_at: string;
  updated_at: string;
  chat_members?: ChatMember[];
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
} 