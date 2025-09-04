
import React, { useState, useEffect } from 'react';
import { Message, MessageSender, User } from '../../types';
import { CopyIcon, ThumbsDownIcon, ThumbsUpIcon } from '../ui/Icons';

// Import the CK logo image
import ckLogo from '../../assets/unnamed.webp';

interface ChatMessageProps {
  message: Message;
  user: User | null;
}

const UserAvatar = ({ user }: { user: User | null }) => {
    if (user?.avatar) {
        return <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
    }
    const initials = `${user?.name[0] || ''}${user?.surname[0] || ''}`.toUpperCase();
    return (
        <div className="w-8 h-8 rounded-full bg-dark-sidebar flex items-center justify-center text-text-primary font-bold text-sm">
            {initials}
        </div>
    )
}

const AiAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img src={ckLogo} alt="CK AI" className="w-full h-full object-cover" />
    </div>
)

const CodeBlock = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="relative group">
            <pre className="bg-gray-800 dark:bg-black/50 text-white font-mono text-sm p-3 my-2 rounded-md overflow-x-auto">
                <code>{code}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 bg-gray-700 rounded-md text-gray-300 hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                {copied ? (
                    <span className="text-xs">Copied!</span>
                ) : (
                    <CopyIcon className="w-4 h-4" />
                )}
            </button>
        </div>
    );
};

const SimpleMarkdown = ({ text }: { text: string }) => {
    // 1. Split by code blocks first to preserve them and handle them separately.
    const parts = text.split(/(```[\s\S]*?```)/g);

    const renderTextWithMarkdown = (content: string) => {
        // Simple inline markdown replacements
        let html = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>');       // Italic

        return { __html: html };
    };

    return (
        <>
            {parts.map((part, index) => {
                if (part.trim() === '') return null;

                // Handle code blocks
                if (part.startsWith('```')) {
                    const code = part.replace(/^```(?:\w+)?\n|```$/g, '').trim();
                    return <CodeBlock key={index} code={code} />;
                }

                // Handle other markdown for non-code parts
                const blocks = part.split(/\n\s*\n/); // Split by one or more empty lines

                return blocks.map((block, blockIndex) => {
                    if (block.trim() === '') return null;
                    const key = `${index}-${blockIndex}`;

                    // Headings
                    if (block.startsWith('### ')) {
                        return <h3 key={key} className="text-lg font-semibold my-1" dangerouslySetInnerHTML={renderTextWithMarkdown(block.substring(4))}></h3>;
                    }
                    if (block.startsWith('## ')) {
                        return <h2 key={key} className="text-xl font-semibold my-2" dangerouslySetInnerHTML={renderTextWithMarkdown(block.substring(3))}></h2>;
                    }
                    if (block.startsWith('# ')) {
                        return <h1 key={key} className="text-2xl font-bold my-2" dangerouslySetInnerHTML={renderTextWithMarkdown(block.substring(2))}></h1>;
                    }

                    // Unordered Lists (check if all non-empty lines are list items)
                    const lines = block.split('\n');
                    const isList = lines.filter(l => l.trim() !== '').every(l => l.trim().startsWith('* ') || l.trim().startsWith('- '));
                    
                    if (isList) {
                         return (
                            <ul key={key} className="list-disc pl-5 my-2 space-y-1">
                                {lines.filter(l => l.trim() !== '').map((item, itemIndex) => (
                                    <li key={itemIndex} dangerouslySetInnerHTML={renderTextWithMarkdown(item.substring(item.indexOf(' ') + 1))}></li>
                                ))}
                            </ul>
                        );
                    }
                    
                    // Paragraphs (handle simple line breaks within a block as <br>)
                    const paragraphContent = block.split('\n').join('<br />');
                    return <p key={key} className="my-2" dangerouslySetInnerHTML={renderTextWithMarkdown(paragraphContent)}></p>;
                });
            })}
        </>
    );
};


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, user }) => {
  const isUser = message.sender === MessageSender.USER;
  const [isCopied, setIsCopied] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsRendered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCopy = () => {
      if (isCopied) return;
      navigator.clipboard.writeText(message.text)
        .then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy text: ', err));
  };
  
  return (
    <div className={`flex items-start gap-3 my-4 transition-all duration-500 ease-in-out ${isUser ? 'justify-end' : 'justify-start'} ${isRendered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {!isUser && <AiAvatar />}
      
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="font-bold text-sm mb-1 text-gray-600 dark:text-gray-400">
            {isUser ? `${user?.name} ${user?.surname}` : 'Ceku'}
        </div>
        <div className={`p-3 rounded-xl max-w-lg shadow-sm ${isUser ? 'bg-dark-sidebar text-text-primary rounded-br-none' : 'bg-gray-200 dark:bg-dark-card text-gray-900 dark:text-text-primary rounded-bl-none'}`}>
          {message.image && <img src={message.image} alt="attachment" className="rounded-lg mb-2 max-w-xs" />}
          {message.file && <div className="p-2 mb-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">{message.file.name}</div>}
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <SimpleMarkdown text={message.text} />
          </div>
        </div>
        {!isUser && message.text && (
            <div className="mt-2 flex items-center gap-2 text-gray-400">
                <button 
                    onClick={handleCopy} 
                    className={`p-1 transition-colors ${isCopied ? 'text-green-500' : 'hover:text-primary'}`}
                    aria-label={isCopied ? "Copied!" : "Copy message"}
                    title={isCopied ? "Copied!" : "Copy message"}
                    disabled={isCopied}
                >
                    <CopyIcon className="w-4 h-4" />
                </button>
                <button className="p-1 hover:text-primary transition-colors" title="Good response"><ThumbsUpIcon className="w-4 h-4" /></button>
                <button className="p-1 hover:text-red-500 transition-colors" title="Bad response"><ThumbsDownIcon className="w-4 h-4" /></button>
            </div>
        )}
      </div>

      {isUser && <UserAvatar user={user} />}
    </div>
  );
};
