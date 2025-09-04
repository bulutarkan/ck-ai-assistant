
import React, { useRef, useEffect } from 'react';
import { Conversation, User } from '../../types';
import { ChatMessage } from './ChatMessage';

interface ChatViewProps {
    conversation: Conversation;
    user: User | null;
    isLoading: boolean;
}

const TypingIndicator = () => (
    <div className="flex items-center justify-center p-2">
        <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"></span>
        </div>
    </div>
);

export const ChatView: React.FC<ChatViewProps> = ({ conversation, user, isLoading }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation.messages, isLoading]);

    return (
        <div className="w-full max-w-4xl mx-auto flex-1 overflow-y-auto">
            <div className="px-4">
                {conversation.messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} user={user} />
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <TypingIndicator />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};
