import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { chatService } from '@/lib/chat-service';
import { Chat } from '@/lib/types/chat';
import { toast } from 'sonner';

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for chat ID in URL params (for direct links)
  useEffect(() => {
    const chatId = searchParams.get('chat'); // TODO: Add chat ID from backend
    if (chatId) {
      setSelectedChatId(chatId);
      loadChatDetails(chatId);
    }
  }, [searchParams]);

  const loadChatDetails = async (chatId: string) => {
    try {
      const chats = await chatService.loadUserChats(); // TODO: Add chat details from backend
      const chat = chats.find(c => c.id === chatId); // TODO: Add chat details from backend
      if (chat) {
        setSelectedChat(chat);
      }
    } catch (error) {
      console.error('Error loading chat details:', error);
      toast.error('Failed to load chat details'); // TODO: Add error message from backend
    }
  };

  const handleChatSelect = async (chatId: string) => {
    setSelectedChatId(chatId);
    setSearchParams({ chat: chatId });
    await loadChatDetails(chatId);
  };

  const handleBackToList = () => {
    setSelectedChatId(null); // TODO: Add clear chat ID from backend
    setSelectedChat(null); // TODO: Add clear chat ID from backend  
    setSearchParams({}); // TODO: Add clear chat ID from backend
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-background rounded-lg border">
      {/* Chat List Sidebar */}
      <div className={`w-80 border-r bg-card ${selectedChatId ? 'hidden md:block' : 'block'}`}> 
        <ChatList 
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
        />
      </div>

      {/* Chat Window */}
      <div className={`flex-1 ${selectedChatId ? 'block' : 'hidden md:block'}`}>
        {selectedChatId ? (
          <ChatWindow
            chatId={selectedChatId}
            chat={selectedChat}
            onBack={handleBackToList}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">
                Select a chat to start messaging
              </div>
              <p className="text-sm text-muted-foreground">
                Choose from your existing conversations or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 