import { chatService } from './chat-service';

/**
 * Test the chat service functionality
 * Note: This requires an authenticated user session
 */
async function testChatService() {
  try {
    console.log('Testing chat service...');

    // 1. Create a direct chat
    const chatId = await chatService.createDirectChat('test-user-id');
    console.log('Created chat:', chatId);

    if (chatId) {
      // 2. Subscribe to messages
      chatService.subscribeToChat(chatId, (message) => {
        console.log('New message received:', message);
      });

      // 3. Send a test message
      const messageSent = await chatService.sendMessage(chatId, 'Hello, this is a test message!');
      console.log('Message sent:', messageSent);

      // 4. Load chat messages
      const messages = await chatService.loadChatMessages(chatId);
      console.log('Chat messages:', messages);

      // 5. Load chat members
      const members = await chatService.loadChatMembers(chatId);
      console.log('Chat members:', members);

      // 6. Load all user chats
      const userChats = await chatService.loadUserChats();
      console.log('User chats:', userChats);

      // 7. Cleanup
      chatService.unsubscribeFromChat(chatId);
    }

    console.log('Chat service test completed');
  } catch (error) {
    console.error('Chat service test failed:', error);
  }
}

// Export the test function
export { testChatService }; 