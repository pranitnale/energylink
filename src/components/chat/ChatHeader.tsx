import { ChatMember } from '@/lib/types/chat';
import { useAuth } from '@/lib/hooks/useAuth';

interface ChatHeaderProps {
  members: ChatMember[];
  typingUsers: Record<string, boolean>;
}

export function ChatHeader({ members, typingUsers }: ChatHeaderProps) {
  const { user } = useAuth();
  
  // Filter out current user and get other members
  const otherMembers = members.filter(member => member.user_id !== user?.id);
  
  // Get typing members (excluding current user)
  const typingMembers = otherMembers.filter(member => typingUsers[member.user_id]);

  return (
    <div className="border-b p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Display member names */}
          <h2 className="font-semibold">
            {otherMembers.map(member => member.profile?.full_name).join(', ')}
          </h2>
          
          {/* Online status indicator */}
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>
      
      {/* Typing indicator */}
      {typingMembers.length > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          {typingMembers.length === 1
            ? `${typingMembers[0].profile?.full_name} is typing...`
            : 'Multiple people are typing...'}
        </div>
      )}
    </div>
  );
} 