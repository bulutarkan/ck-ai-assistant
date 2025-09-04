
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Conversation, Message, MessageSender } from '../types';
import { generateResponseStream, generateTitle } from '../services/geminiService';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabaseClient';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

interface ChatContextType {
    conversations: Conversation[];
    activeConversation: Conversation | null | undefined;
    isLoading: boolean;
    startNewChat: () => void;
    selectConversation: (id: string) => void;
    deleteConversation: (id: string) => void;
    renameConversation: (id: string, newTitle: string) => void;
    sendMessage: (text: string, file?: File) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();

    // Load conversations from Supabase when user logs in
    const loadConversations = useCallback(async () => {
        if (!user) {
            console.log('❌ No user available for loading conversations');
            setConversations([]);
            setActiveConversationId(null);
            return;
        }

        console.log('� Loading conversations from database...');

        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error loading conversations:', error);
                console.error('Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                return;
            }

            console.log('✅ Successfully loaded conversations:', data?.length || 0);

            const formattedConversations: Conversation[] = data.map(chat => ({
                id: chat.id,
                title: chat.title,
                messages: chat.messages || [],
                createdAt: new Date(chat.created_at).getTime(),
            }));

            console.log('📝 Formatted conversations:', formattedConversations.length);
            setConversations(formattedConversations);
        } catch (error) {
            console.error('💥 Exception loading conversations:', error);
        }
    }, [user]);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const saveConversationToDB = useCallback(async (conversation: Conversation) => {
        if (!user) {
            console.error('❌ Cannot save conversation: No user available');
            return;
        }

        console.log('💾 Saving conversation to DB:', {
            conversationId: conversation.id,
            userId: user.id,
            title: conversation.title,
            messageCount: conversation.messages.length
        });

        try {
            const fullName = (user.name?.trim() && user.surname?.trim())
                ? `${user.name.trim()} ${user.surname.trim()}`
                : user.name?.trim() || user.surname?.trim() || 'User';

            const chatData = {
                id: conversation.id,
                user_id: user.id,
                title: conversation.title,
                user_full_name: fullName,
                messages: conversation.messages,
            };

            console.log('📤 Sending data to Supabase:', chatData);

            const { data, error } = await supabase
                .from('chats')
                .upsert(chatData, { onConflict: 'id' })
                .select();

            if (error) {
                console.error('❌ Error saving conversation:', error);
                console.error('Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
            } else {
                console.log('✅ Conversation saved successfully:', data);
            }
        } catch (error) {
            console.error('💥 Exception saving conversation:', error);
            console.error('Exception details:', error);
        }
    }, [user]);

    const updateConversation = useCallback((id: string, updateFn: (conv: Conversation) => Conversation) => {
        setConversations(prev => prev.map(conv => {
            if (conv.id === id) {
                const updatedConv = updateFn(conv);
                saveConversationToDB(updatedConv);
                return updatedConv;
            }
            return conv;
        }));
    }, [saveConversationToDB]);

    const startNewChat = useCallback(() => {
        // Clear file input if any when starting new chat
        if (activeConversation && activeConversation.messages.length === 0) {
            // If current conversation is empty, just clear active conversation
            setActiveConversationId(null);
        } else {
            setActiveConversationId(null);
        }
    }, [activeConversation]);

    const selectConversation = useCallback((id: string) => {
        setActiveConversationId(id);
    }, []);

    const deleteConversation = useCallback(async (id: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('chats')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting conversation:', error);
                return;
            }

            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }, [activeConversationId, user]);

    const renameConversation = useCallback((id: string, newTitle: string) => {
        updateConversation(id, conv => ({ ...conv, title: newTitle }));
    }, [updateConversation]);

    const sendMessage = useCallback(async (text: string, file?: File) => {
        if (!user) {
            console.error('❌ Cannot send message: No user available');
            return;
        }

        console.log('💬 Sending message for user:', {
            userId: user.id,
            userName: user.name,
            userSurname: user.surname,
            messageText: text.substring(0, 50) + (text.length > 50 ? '...' : '')
        });

        setIsLoading(true);

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            sender: MessageSender.USER,
            text,
            timestamp: Date.now(),
            image: file ? await fileToBase64(file) : undefined
        };

        let conversationId = activeConversationId;
        let needsTitle = false;

        // Create new conversation if none is active
        if (!conversationId) {
            // Generate a proper UUID for the conversation ID
            conversationId = crypto.randomUUID();
            needsTitle = true;
            const newConversation: Conversation = {
                id: conversationId,
                title: 'New Conversation',
                messages: [userMessage],
                createdAt: Date.now(),
            };
            setConversations(prev => [newConversation, ...prev]);
            setActiveConversationId(conversationId);
            await saveConversationToDB(newConversation);
        } else {
            // Add message to existing conversation
            updateConversation(conversationId, conv => ({
                ...conv,
                messages: [...conv.messages, userMessage],
            }));
        }

        const aiMessageId = `msg-${Date.now()}-ai`;
        const aiMessagePlaceholder: Message = {
            id: aiMessageId,
            sender: MessageSender.AI,
            text: '',
            timestamp: Date.now(),
        };

        updateConversation(conversationId, conv => ({
            ...conv,
            messages: [...conv.messages, aiMessagePlaceholder],
        }));

        try {
            // Build conversation history for AI context
            const currentConversation = conversations.find(c => c.id === conversationId);
            let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

            if (currentConversation && currentConversation.messages.length > 1) {
                // Include all previous messages except the current one being sent
                conversationHistory = currentConversation.messages
                    .slice(0, -1) // Exclude the current user message (last one)
                    .filter(msg => msg.text && msg.text.trim()) // Only messages with content
                    .map(msg => ({
                        role: msg.sender === MessageSender.USER ? 'user' as const : 'assistant' as const,
                        content: msg.text
                    }));
            }

            console.log('📜 Sending conversation history:', {
                historyLength: conversationHistory.length,
                currentMessage: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                conversationId
            });

            const stream = generateResponseStream({
                prompt: text,
                conversationHistory,
                image: file ? { base64: userMessage.image!, mimeType: file.type } : undefined,
                user: user,
            });

            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                updateConversation(conversationId, conv => ({
                    ...conv,
                    messages: conv.messages.map(m => m.id === aiMessageId ? { ...m, text: fullResponse } : m),
                }));
            }

            if (needsTitle && fullResponse) {
                const newTitle = await generateTitle(`${text}\n\n${fullResponse}`);
                updateConversation(conversationId, conv => ({ ...conv, title: newTitle }));
            }

        } catch (error) {
            console.error("Error sending message to AI:", error);
            updateConversation(conversationId, conv => ({
                ...conv,
                messages: conv.messages.map(m => m.id === aiMessageId ? {
                    ...m,
                    text: "I'm sorry, I encountered an error while processing your request. Please try again."
                } : m),
            }));
        } finally {
            setIsLoading(false);
        }

    }, [activeConversationId, updateConversation, user, saveConversationToDB]);

    const value = {
        conversations,
        activeConversation,
        isLoading,
        startNewChat,
        selectConversation,
        deleteConversation,
        renameConversation,
        sendMessage,
    };

// FIX: Replaced JSX with React.createElement to avoid syntax errors in a .ts file.
// This resolves "Cannot find namespace 'ChatContext'" and "Operator '<' cannot be applied..." errors.
    return React.createElement(ChatContext.Provider, { value }, children);
};

export const useChat = (): ChatContextType => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};
