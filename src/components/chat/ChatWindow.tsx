import { useState, useEffect, useRef } from 'react';
import { Send, Edit, Trash2, MoreVertical, Users, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { chatService } from '@/lib/chat-service';
import { Message, Chat, ChatMember } from '@/lib/types/chat';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChatWindowProps {
  chatId: string;
  chat?: Chat;
  onBack?: () => void;
}

export function ChatWindow({ chatId, chat, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  useEffect(() => {
    loadChatData();
    getCurrentUser();
  }, [chatId]);

  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const loadChatData = async () => {
    try {
      setLoading(true);
      
      // Load messages and members in parallel
      const [messagesData, membersData] = await Promise.all([
        chatService.loadChatMessages(chatId),
        chatService.loadChatMembers(chatId)
      ]);

      setMessages(messagesData);
      setMembers(membersData);
      setShouldScrollToBottom(true);
      
      // Subscribe to real-time updates
      chatService.subscribeToChat(
        chatId, 
        handleNewMessage,
        handleMessageDelete
      );
      
    } catch (error) {
      console.error('Error loading chat data:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.find(m => m.id === message.id)) {
        return prev;
      }
      setShouldScrollToBottom(true);
      return [...prev, message];
    });
  };

  const handleMessageDelete = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const success = await chatService.deleteMessage(messageId);
      if (success) {
        // Message will be removed via real-time subscription
        toast.success('Message deleted');
      } else {
        toast.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const sentMessage = await chatService.sendMessage(chatId, newMessage.trim());
      
      if (sentMessage) {
        setNewMessage('');
        setShouldScrollToBottom(true);
        // Message will be added via real-time subscription
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessageId || !editText.trim()) return;

    try {
      const updatedMessage = await chatService.editMessage(editingMessageId, editText.trim());
      if (updatedMessage) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === editingMessageId ? updatedMessage : msg
          )
        );
        setEditingMessageId(null);
        setEditText('');
        toast.success('Message updated');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditText(message.body);
    inputRef.current?.focus();
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const getMemberProfile = (userId: string) => {
    return members.find(member => member.user_id === userId)?.profile;
  };

  const getChatDisplayName = () => {
    if (chat?.is_group && chat.name) {
      return chat.name;
    }
    
    const otherMember = members.find(member => 
      member.user_id !== currentUserId
    );
    
    return otherMember?.profile?.full_name || 'Unknown User';
  };

  const getChatAvatar = () => {
    if (chat?.is_group) {
      return undefined;
    }
    
    const otherMember = members.find(member => 
      member.user_id !== currentUserId
    );
    
    return otherMember?.profile?.avatar_url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getChatAvatar()} />
              <AvatarFallback>
                {chat?.is_group ? (
                  <Users className="h-5 w-5" />
                ) : (
                  (getChatDisplayName().charAt(0) || '?').toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-medium">
                {chat?.is_group ? chat.name : getChatDisplayName()}
              </h3>
              {members.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            const profile = getMemberProfile(message.sender_id);

            return (
              <div key={message.id} className="group">
                <div className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(profile?.full_name?.charAt(0) || '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                    <span className="text-sm text-muted-foreground mb-1">
                      {profile?.full_name || 'Unknown user'}
                    </span>

                    <Card className={`${isOwnMessage ? 'bg-primary text-primary-foreground' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm break-words">{message.body}</p>
                          
                          {isOwnMessage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => startEditing(message)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            ref={inputRef}
            value={editingMessageId ? editText : newMessage}
            onChange={(e) => editingMessageId ? setEditText(e.target.value) : setNewMessage(e.target.value)}
            placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
            disabled={sending}
            className="flex-1"
          />
          
          {editingMessageId ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button type="button" onClick={handleEditMessage} disabled={!editText.trim()}>
                Save
              </Button>
            </div>
          ) : (
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
} 