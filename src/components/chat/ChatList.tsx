import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, Trash2, MoreVertical, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { chatService } from '@/lib/chat-service';
import { Chat, ChatMember } from '@/lib/types/chat';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
}

export function ChatList({ onChatSelect, selectedChatId }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadChats();
    getCurrentUser();
  }, []);

  // Save scroll position before unmounting
  useEffect(() => {
    const chatList = chatListRef.current;
    if (chatList) {
      chatList.scrollTop = scrollPosition;
    }

    return () => {
      if (chatList) {
        setScrollPosition(chatList.scrollTop);
      }
    };
  }, []);

  // Handle scroll position changes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPosition(e.currentTarget.scrollTop);
  };

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      const userChats = await chatService.loadUserChats();
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    if (chat.is_group && chat.name) {
      return chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    // For direct chats, search in member names
    const memberNames = chat.chat_members
      ?.map(member => member.profile?.full_name || 'Unknown')
      .join(' ')
      .toLowerCase();
    
    return memberNames?.includes(searchQuery.toLowerCase());
  });

  const getChatDisplayName = (chat: Chat) => {
    if (chat.is_group && chat.name) {
      return chat.name;
    }
    
    // For direct chats, show other user's name
    const otherMember = chat.chat_members?.find(member => 
      member.user_id !== currentUserId
    );
    
    return otherMember?.profile?.full_name || 'Loading...';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.is_group) {
      return null; // Use group icon
    }
    
    // For direct chats, show other user's avatar
    const otherMember = chat.chat_members?.find(member => 
      member.user_id !== currentUserId
    );
    
    return otherMember?.profile?.avatar_url || null;
  };

  const getMemberNames = (chat: Chat) => {
    if (!chat.chat_members) return '';
    
    return chat.chat_members
      .filter(member => member.user_id !== currentUserId)
      .map(member => member.profile?.full_name || 'Loading...')
      .join(', ');
  };

  const handleDeleteChat = async (chatId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent chat selection when clicking delete

    try {
      const result = await chatService.deleteChat(chatId);
      if (result.success) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        toast.success('Chat deleted successfully');
        
        // If the deleted chat was selected, clear the selection
        if (selectedChatId === chatId) {
          onChatSelect('');
        }
      } else {
        // Show the specific error message from the service
        toast.error(result.error || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Messages</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div 
        ref={chatListRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No chats yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation from the Find Partners page
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <Card
                key={chat.id}
                className={`mb-2 cursor-pointer hover:bg-accent ${
                  selectedChatId === chat.id ? 'bg-accent' : ''
                }`}
                onClick={() => onChatSelect(chat.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getChatAvatar(chat)} />
                        <AvatarFallback>
                          {chat.is_group ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            (getChatDisplayName(chat).charAt(0) || '?').toUpperCase()
                          )}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {chat.is_group ? chat.name : getMemberNames(chat)}
                          </h4>
                          {chat.is_group && (
                            <Badge variant="secondary" className="text-xs">
                              Group
                            </Badge>
                          )}
                        </div>
                        
                        {chat.chat_members && chat.chat_members.length > 0 && (
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.chat_members.length} member{chat.chat_members.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Add dropdown menu for chat actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 