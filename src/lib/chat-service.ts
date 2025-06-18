import { supabase } from './supabase';
import { Chat, ChatMember, Message } from './types/chat';

export class ChatService {
  private channelSubscriptions: Map<string, any> = new Map();
  private broadcastChannels: Map<string, any> = new Map();

  /**
   * Creates or retrieves a direct chat with another user
   */
  async createDirectChat(otherUserId: string): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      // First check if a direct chat already exists
      const { data: existingMembers } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', otherUserId);

      if (existingMembers && existingMembers.length > 0) {
        // Check if any of these chats also has the current user as a member
        const chatIds = existingMembers.map(m => m.chat_id);
        const { data: sharedChats } = await supabase
          .from('chats')
          .select('id')
          .eq('is_group', false)
          .in('id', chatIds);

        if (sharedChats && sharedChats.length > 0) {
          // Verify current user is a member
          const { data: membership } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', session.user.id)
            .in('chat_id', sharedChats.map(c => c.id))
            .single();

          if (membership) {
            return membership.chat_id;
          }
        }
      }

      // Create a new direct chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: false,
          created_by: session.user.id
        })
        .select()
        .single();

      if (chatError || !newChat) throw chatError;

      // Add both users to the chat
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert([
          { chat_id: newChat.id, user_id: session.user.id },
          { chat_id: newChat.id, user_id: otherUserId }
        ]);

      if (membersError) throw membersError;

      return newChat.id;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      return null;
    }
  }

  /**
   * Creates a new group chat
   */
  async createGroupChat(name: string, memberIds: string[]): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      // Create a new group chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: true,
          created_by: session.user.id,
          name: name // Add name field to chats table if not exists
        })
        .select()
        .single();

      if (chatError || !newChat) throw chatError;

      // Add all members to the chat
      const memberData = memberIds.map(userId => ({
        chat_id: newChat.id,
        user_id: userId
      }));
      
      // Add creator as well
      memberData.push({
        chat_id: newChat.id,
        user_id: session.user.id
      });

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(memberData);

      if (membersError) throw membersError;

      return newChat.id;
    } catch (error) {
      console.error('Error creating group chat:', error);
      return null;
    }
  }

  /**
   * Load messages for a specific chat
   */
  async loadChatMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Load members of a specific chat
   */
  async loadChatMembers(chatId: string): Promise<ChatMember[]> {
    // First get the chat members
    const { data: members, error: membersError } = await supabase
      .from('chat_members')
      .select('*')
      .eq('chat_id', chatId);

    if (membersError) throw membersError;
    if (!members) return [];

    // Then get their profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', members.map(m => m.user_id));

    if (profilesError) throw profilesError;

    // Combine the data
    return members.map(member => ({
      ...member,
      profile: profiles?.find(p => p.id === member.user_id) || null
    }));
  }

  /**
   * Load all chats for the current user
   */
  async loadUserChats(): Promise<Chat[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    try {
      // Get all chat memberships for the user
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', session.user.id);

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      // Get the chats
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .in('id', memberships.map(m => m.chat_id));

      if (chatsError) throw chatsError;
      if (!chats) return [];

      // Get all members for these chats
      const { data: allMembers, error: membersError } = await supabase
        .from('chat_members')
        .select('*')
        .in('chat_id', chats.map(c => c.id));

      if (membersError) throw membersError;

      // Get all profiles for the members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allMembers?.map(m => m.user_id) || []);

      if (profilesError) throw profilesError;

      // Create a map of profiles for quick lookup
      const profileMap = new Map(
        profiles?.map(profile => [profile.id, profile]) || []
      );

      // Combine all the data
      return chats.map(chat => ({
        ...chat,
        chat_members: allMembers
          ?.filter(m => m.chat_id === chat.id)
          .map(member => ({
            ...member,
            profile: profileMap.get(member.user_id) || {
              id: member.user_id,
              full_name: 'Unknown User'
            }
          })) || []
      })).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    } catch (error) {
      console.error('Error loading chats:', error);
      throw error;
    }
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(chatId: string, body: string): Promise<Message | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: session.user.id,
        body
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Subscribe to real-time updates in a chat using Broadcast
   */
  subscribeToChat(
    chatId: string, 
    onMessage: (message: Message) => void,
    onDelete?: (messageId: string) => void,
    onPresence?: (presence: Record<string, any>) => void
  ) {
    // Unsubscribe from any existing subscription
    this.unsubscribeFromChat(chatId);

    // Create broadcast channel with proper configuration
    const broadcastChannel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              onMessage(payload.new as Message);
              break;
            case 'UPDATE':
              console.log('Message updated successfully');
              break;
            case 'DELETE':
              console.log('Message deleted successfully');
              if (onDelete) {
                onDelete(payload.old.id);
              }
              break;
          }
        }
      );

    // Subscribe to the broadcast channel
    broadcastChannel.subscribe((status) => {
      console.log(`Broadcast channel status updated for chat ${chatId}`);
      
      if (status === 'SUBSCRIBED' && onPresence) {
        supabase.auth.getSession().then(({ data: { session }}) => {
          if (session?.user) {
            broadcastChannel.track({
              user_id: session.user.id,
              typing: false
            });
          }
        });
      }
    });

    this.broadcastChannels.set(chatId, broadcastChannel);
  }

  /**
   * Unsubscribe from real-time updates in a chat
   */
  unsubscribeFromChat(chatId: string) {
    const broadcastChannel = this.broadcastChannels.get(chatId);
    if (broadcastChannel) {
      broadcastChannel.unsubscribe();
      this.broadcastChannels.delete(chatId);
    }
  }

  /**
   * Update typing status in a chat
   */
  async updateTypingStatus(chatId: string, isTyping: boolean) {
    const broadcastChannel = this.broadcastChannels.get(chatId);
    if (broadcastChannel) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await broadcastChannel.track({
          user_id: session.user.id,
          typing: isTyping
        });
      }
    }
  }

  /**
   * Delete a message (only own messages)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      // First verify the message belongs to the user
      const { data: message } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (!message || message.sender_id !== session.user.id) {
        throw new Error('Unauthorized to delete this message');
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Edit a message (only own messages)
   */
  async editMessage(messageId: string, newBody: string): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ body: newBody })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error editing message:', error);
      return null;
    }
  }

  /**
   * Add member to group chat
   */
  async addMemberToChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chatId,
          user_id: userId
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding member to chat:', error);
      return false;
    }
  }

  /**
   * Remove member from chat
   */
  async removeMemberFromChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing member from chat:', error);
      return false;
    }
  }

  /**
   * Leave a chat
   */
  async leaveChat(chatId: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    return this.removeMemberFromChat(chatId, session.user.id);
  }

  /**
   * Delete a chat (only if empty and user is the creator)
   */
  async deleteChat(chatId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { success: false, error: 'You must be logged in to delete a chat' };
      }

      // First verify the chat is empty
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (messagesError) throw messagesError;
      
      if (messages && messages.length > 0) {
        return { 
          success: false, 
          error: 'This chat contains messages and cannot be deleted. Please delete all messages first.' 
        };
      }

      // Then verify the user is the creator
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('created_by')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;
      
      if (!chat || chat.created_by !== session.user.id) {
        return { 
          success: false, 
          error: 'You can only delete chats that you created' 
        };
      }

      // Delete the chat
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting chat:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred while deleting the chat' 
      };
    }
  }
}

// Export a singleton instance
export const chatService = new ChatService(); 