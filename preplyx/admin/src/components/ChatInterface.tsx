import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Trash2, Settings, User, Bot, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { aiService } from '../services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatInterfaceProps {
  selectedProvider: string;
  apiKey: string;
  onProviderChange?: (provider: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  selectedProvider, 
  apiKey,
  onProviderChange 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  useEffect(() => {
    // Load conversations from localStorage
    const savedConversations = localStorage.getItem('ai_conversations');
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      setConversations(parsed.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      })));
    }
  }, []);

  useEffect(() => {
    // Save conversations to localStorage
    if (conversations.length > 0) {
      localStorage.setItem('ai_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      provider: selectedProvider,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setShowSidebar(false);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    if (onProviderChange && conversation.provider !== selectedProvider) {
      onProviderChange(conversation.provider);
    }
    setShowSidebar(false);
  };

  const generateTitle = async (firstMessage: string): Promise<string> => {
    // Simple title generation - in production, you'd use AI to generate meaningful titles
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !apiKey) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
      provider: selectedProvider
    };

    let activeConversation: Conversation;
    
    if (!currentConversation) {
      activeConversation = {
        id: Date.now().toString(),
        title: await generateTitle(userMessage.content),
        messages: [userMessage],
        provider: selectedProvider,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setConversations(prev => [activeConversation, ...prev]);
    } else {
      activeConversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, userMessage],
        updatedAt: new Date()
      };
      setConversations(prev => prev.map(c => c.id === activeConversation.id ? activeConversation : c));
    }

    setCurrentConversation(activeConversation);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get actual AI response from the selected provider
      const aiResponse = await getAIResponse(userMessage.content, selectedProvider, apiKey);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        provider: selectedProvider
      };

      const updatedConversation = {
        ...activeConversation,
        messages: [...activeConversation.messages, assistantMessage],
        updatedAt: new Date()
      };

      setConversations(prev => prev.map(c => c.id === updatedConversation.id ? updatedConversation : c));
      setCurrentConversation(updatedConversation);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please check your API key and try again.',
        timestamp: new Date(),
        provider: selectedProvider
      };

      const errorConversation = {
        ...activeConversation,
        messages: [...activeConversation.messages, errorMessage],
        updatedAt: new Date()
      };

      setConversations(prev => prev.map(c => c.id === errorConversation.id ? errorConversation : c));
      setCurrentConversation(errorConversation);
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (message: string, provider: string, apiKey: string): Promise<string> => {
    try {
      const response = await aiService.chatWithProvider(provider, message, {
        apiKey,
        temperature: 0.7,
        maxTokens: 1000
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.content;
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const providerNames: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini: 'Google Gemini',
    grok: 'Grok',
    claude: 'Claude',
    copilot: 'Microsoft Copilot',
    perplexity: 'Perplexity AI',
    mistral: 'Mistral AI',
    llama: 'Meta Llama'
  };

  if (!apiKey) {
    return (
      <div className="chat-interface no-api-key">
        <div className="no-api-key-message">
          <Bot size={64} />
          <h2>API Key Required</h2>
          <p>Please configure an API key for {providerNames[selectedProvider] || 'the selected AI provider'} to start chatting.</p>
          <button onClick={() => setShowProviderSelector(true)} className="configure-button">
            <Settings size={18} />
            Configure API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {/* Sidebar */}
      <div className={`chat-sidebar ${showSidebar ? 'show' : 'hide'}`}>
        <div className="sidebar-header">
          <button onClick={createNewConversation} className="new-chat-button">
            <Plus size={18} />
            <span>New Chat</span>
          </button>
          <button 
            onClick={() => setShowSidebar(false)} 
            className="close-sidebar-button"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        <div className="conversations-list">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${currentConversation?.id === conversation.id ? 'active' : ''}`}
              onClick={() => selectConversation(conversation)}
            >
              <div className="conversation-title">
                <Bot size={16} />
                <span>{conversation.title}</span>
              </div>
              <div className="conversation-meta">
                <Clock size={12} />
                <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
                className="delete-conversation-button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          {!showSidebar && (
            <button 
              onClick={() => setShowSidebar(true)} 
              className="open-sidebar-button"
            >
              <ChevronUp size={18} />
            </button>
          )}
          
          <div className="chat-provider-info">
            <Bot size={20} />
            <span>{providerNames[selectedProvider] || selectedProvider}</span>
          </div>

          <div className="chat-actions">
            <button 
              onClick={() => setShowProviderSelector(!showProviderSelector)}
              className="provider-selector-button"
            >
              <Settings size={18} />
              <span>Change Provider</span>
            </button>
          </div>
        </div>

        {/* Provider Selector Dropdown */}
        {showProviderSelector && onProviderChange && (
          <div className="provider-selector-dropdown">
            <div className="provider-selector-content">
              <h3>Select AI Provider</h3>
              <div className="provider-options">
                {Object.entries(providerNames).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => {
                      onProviderChange(id);
                      setShowProviderSelector(false);
                    }}
                    className={`provider-option ${selectedProvider === id ? 'active' : ''}`}
                  >
                    <Bot size={16} />
                    <span>{name}</span>
                    {selectedProvider === id && <span className="check-indicator">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="chat-messages">
          {!currentConversation ? (
            <div className="empty-state">
              <Bot size={64} />
              <h2>Start a conversation</h2>
              <p>Choose a provider from the settings and start chatting with AI</p>
              <button onClick={createNewConversation} className="start-chat-button">
                <Plus size={18} />
                <span>New Conversation</span>
              </button>
            </div>
          ) : (
            <>
              {currentConversation.messages.map(message => (
                <div
                  key={message.id}
                  className={`message ${message.role}`}
                >
                  <div className="message-avatar">
                    {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {message.role === 'user' ? 'You' : (message.provider && providerNames[message.provider]) || message.provider || 'AI'}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-text">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="message-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};