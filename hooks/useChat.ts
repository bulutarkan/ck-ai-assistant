
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { Conversation, Message, MessageSender } from '../types';
import { generateResponseStream, generateTitle } from '../services/geminiService';
import { useAuth } from './useAuth';
import { supabase, uploadFile, getFileUrl } from '../services/supabaseClient';

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

    // Function to refresh conversation data from Supabase
    const refreshConversationFromDB = useCallback(async (conversationId: string) => {
        if (!user) return;

        try {
            console.log('🔄 Refreshing conversation from DB:', conversationId);
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('id', conversationId)
                .single();

            if (error) {
                console.error('❌ Error refreshing conversation:', error);
                return;
            }

            if (data) {
                console.log('✅ Refreshed conversation with', data.messages?.length || 0, 'messages');
                setConversations(prev => prev.map(conv =>
                    conv.id === conversationId ? {
                        id: data.id,
                        title: data.title,
                        messages: data.messages || [],
                        createdAt: new Date(data.created_at).getTime(),
                    } : conv
                ));
            }
        } catch (error) {
            console.error('💥 Exception refreshing conversation:', error);
        }
    }, [user]);

    const startNewChat = useCallback(() => {
        // Clear file input if any when starting new chat
        if (activeConversation && activeConversation.messages.length === 0) {
            // If current conversation is empty, just clear active conversation
            setActiveConversationId(null);
        } else {
            setActiveConversationId(null);
        }
    }, [activeConversation]);

    const selectConversation = useCallback(async (id: string) => {
        console.log('🔄 Selecting conversation:', id);
        setActiveConversationId(id);
        // Refresh conversation data from DB when selecting
        await refreshConversationFromDB(id);
    }, [refreshConversationFromDB]);

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
            messageText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            hasFile: !!file,
            fileInfo: file ? {
                name: file.name,
                type: file.type,
                size: file.size,
                sizeMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
            } : null
        });

        setIsLoading(true);

        let base64Image: string | undefined;
        let filePath: string | undefined;

        if (file) {
            try {
                // For images, we need base64 for Gemini API, but also upload to storage
                if (file.type.startsWith('image/')) {
                    console.log('🖼️ Processing image file...');
                    base64Image = await fileToBase64(file);

                    // Also upload to storage for permanent reference
                    console.log('🗂️ Uploading image to storage...');
                    filePath = await uploadFile(file, user.id);
                    console.log('✅ Image uploaded to storage:', filePath);
                } else {
                    // For non-image files, only upload to storage
                    console.log('📄 Processing non-image file...');
                    filePath = await uploadFile(file, user.id);
                    console.log('✅ File uploaded to storage:', filePath);
                }
            } catch (error) {
                console.error('❌ File processing/upload failed:', error);
                setIsLoading(false);
                return;
            }
        }

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            sender: MessageSender.USER,
            text,
            timestamp: Date.now(),
            image: base64Image,
            file: file ? {
                name: file.name,
                type: file.type,
                size: file.size,
                path: filePath
            } : undefined
        };

        console.log('📝 User message created:', {
            id: userMessage.id,
            hasImage: !!userMessage.image,
            hasFile: !!userMessage.file,
            filePath: filePath,
            imageLength: base64Image?.length
        });

        let conversationId = activeConversationId;
        let needsTitle = false;

        // Create new conversation if none is active
        // First, ensure user message is added to conversation
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
            // Refresh conversation from DB first to ensure we have latest data
            await refreshConversationFromDB(conversationId);

            // Small delay to ensure state update
            await new Promise(resolve => setTimeout(resolve, 50));

            // Get the fresh conversation data after refresh
            let currentConversation = conversations.find(c => c.id === conversationId);

            console.log('🔄 After refresh - conversation check:', {
                conversationId,
                foundConversation: !!currentConversation,
                conversationMessagesCount: currentConversation?.messages?.length || 0,
                activeConversationId
            });

            console.log('🔍 Debug conversation finding:', {
                conversationId,
                activeConversationId,
                foundConversation: !!currentConversation,
                conversationsCount: conversations.length,
                allConversationIds: conversations.map(c => c.id),
                usingFallback: !currentConversation && conversationId === activeConversationId
            });

            let conversationHistory: Array<{ role: 'user' | 'model'; content: string }> = [];

            if (currentConversation && currentConversation.messages) {
                // Include all previous messages except the AI placeholder
                const rawMessages = currentConversation.messages;

                conversationHistory = rawMessages
                    .filter(msg => msg.id !== aiMessageId && msg.text && msg.text.trim())
                    .map(msg => ({
                        role: msg.sender === MessageSender.USER ? 'user' as const : 'model' as const,
                        content: msg.text
                    }));

                console.log('📋 Raw messages in conversation:', {
                    totalRawMessages: rawMessages.length,
                    filteredMessages: conversationHistory.length,
                    messageSummary: rawMessages.map(m => ({
                        id: m.id,
                        sender: m.sender,
                        hasText: !!m.text,
                        isAiPlaceholder: m.id === aiMessageId
                    }))
                });
            }

            console.log('📜 Full conversation context for AI:', {
                conversationId,
                conversationFound: !!currentConversation,
                totalMessages: currentConversation?.messages?.length || 0,
                historyLength: conversationHistory.length,
                fullHistory: conversationHistory,
                last3Messages: conversationHistory.slice(-3),
                currentUserMessage: text,
                isNewConversation: conversationHistory.length === 0,
                hasPreviousInteractions: conversationHistory.length > 0,
                conversationHistorySample: conversationHistory.slice(0, 2) // Show first 2 for debugging
            });

            const stream = generateResponseStream({
                prompt: text,
                conversationHistory,
                image: file ? { base64: userMessage.image!, mimeType: file.type } : undefined,
                user: user,
            });

            let fullResponse = '';
            let hasReceivedChunk = false;
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Response timeout')), 30000) // 30 second timeout
            );

            const streamPromise = (async () => {
                for await (const chunk of stream) {
                    hasReceivedChunk = true;
                    fullResponse += chunk;
                    updateConversation(conversationId, conv => ({
                        ...conv,
                        messages: conv.messages.map(m => m.id === aiMessageId ? { ...m, text: fullResponse } : m),
                    }));
                }
            })();

            await Promise.race([streamPromise, timeoutPromise]);

            // If no chunks were received, it means the stream failed silently
            if (!hasReceivedChunk) {
                throw new Error('No response received from AI');
            }

            if (needsTitle && fullResponse) {
                const newTitle = await generateTitle(`${text}\n\n${fullResponse}`);
                updateConversation(conversationId, conv => ({ ...conv, title: newTitle }));
            }

            // Final refresh to ensure everything is synchronized
            await refreshConversationFromDB(conversationId);

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
