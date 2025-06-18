import { useRef, useEffect } from 'react';
import { Message, ChatMember } from '@/lib/types/chat';
import { supabase } from '@/lib/supabase';

interface MessageListProps {
  messages: Message[];
  members: ChatMember[];
}

export function MessageList({ messages, members }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUser = supabase.auth.getSession()?.user;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get member info by ID
  const getMemberInfo = (userId: string) => {
    return members.find(member => member.user_id === userId)?.profile;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUser?.id;
        const senderProfile = getMemberInfo(message.sender_id);

        return (
          <div
            key={message.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex flex-col max-w-[70%]">
              {/* Sender name */}
              {!isCurrentUser && (
                <span className="text-sm text-gray-500 mb-1">
                  {senderProfile?.full_name}
                </span>
              )}
              
              {/* Message bubble */}
              <div
                className={`rounded-lg p-3 ${
                  isCurrentUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.body}
              </div>
              
              {/* Timestamp */}
              <span className="text-xs text-gray-400 mt-1">
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
} 