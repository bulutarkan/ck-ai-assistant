
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpIcon, PaperclipIcon, MicIcon, XIcon } from '../ui/Icons';

// Fix: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These types are not always included in default TypeScript configurations.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
}

interface ChatInputProps {
  onSendMessage: (text: string, file?: File) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ file: File, preview: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkPreviews, setLinkPreviews] = useState<any[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Corresponds to max-h-50
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [text]);

  // Link Detection
  const detectLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  };

  const handleTextChange = (value: string) => {
    setText(value);

    // Detect URLs and create previews
    const urls = detectLinks(value);
    if (urls.length > 0) {
      urls.forEach(url => {
        if (!linkPreviews.some(preview => preview.url === url)) {
          fetchLinkPreview(url);
        }
      });
    }
  };



  const handleSendMessage = () => {
    if ((!text.trim() && !attachment) || isLoading) return;
    onSendMessage(text, attachment?.file);
    setText('');
    setAttachment(null);
    setLinkPreviews([]); // Clear link previews
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchLinkPreview = async (url: string) => {
    try {
      const hostname = new URL(url).hostname;

      // For favicon
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;

      // For title - using hostname as fallback for now (CORS limitation)
      const title = hostname.replace('www.', '');

      const preview = {
        url,
        favicon: faviconUrl,
        title,
        domain: hostname
      };

      setLinkPreviews(prev => [...prev.filter(p => p.url !== url), preview]);
    } catch (error) {
      console.error('Error creating link preview:', error);
      // Fallback
      try {
        const hostname = new URL(url).hostname;
        const fallbackPreview = {
          url,
          favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
          title: hostname,
          domain: hostname
        };
        setLinkPreviews(prev => [...prev.filter(p => p.url !== url), fallbackPreview]);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
  };

  const getFileAcceptString = (file: File) => {
    // Supported file types with their MIME types
    const supportedTypes = {
      // Images
      'image/jpeg': '.jpg,.jpeg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',

      // Documents
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',

      // Text files
      'text/plain': '.txt',
      'text/csv': '.csv',
      'application/json': '.json',

      // Archives
      'application/zip': '.zip',
      'application/x-rar-compressed': '.rar'
    };

    return supportedTypes[file.type as keyof typeof supportedTypes] || '';
  };

  const isFileSupported = (file: File) => {
    const supportedMimes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',

      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Text
      'text/plain', 'text/csv', 'application/json',

      // Archives
      'application/zip', 'application/x-rar-compressed'
    ];

    return supportedMimes.includes(file.type);
  };

  const handleFileSelection = (file: File | undefined) => {
    if (file && isFileSupported(file)) {
        // For image files, create preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment({ file, preview: reader.result as string });
                setIsDragOver(false);
            };
            reader.readAsDataURL(file);
        } else {
            // For non-image files, create file attachment without preview
            setAttachment({ file, preview: '' });
            setIsDragOver(false);
        }
    }
  };

  // Drag and Drop Handler Functions
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're actually leaving the drop zone
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };
  
  const handleMicClick = () => {
    // Fix: Cast window to `any` to access browser-specific SpeechRecognition APIs.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Sorry, your browser doesn't support speech recognition.");
        return;
    }

    if (isRecording) {
        recognitionRef.current?.stop();
        return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
        setIsRecording(true);
    };

    recognitionRef.current.onend = () => {
        setIsRecording(false);
    };

    recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
    };

    recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
        if (finalTranscript) {
            setText(prevText => (prevText.trim() ? prevText + ' ' : '') + finalTranscript.trim());
        }
    };
    
    recognitionRef.current.start();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);


  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div
        className={`relative bg-dark-card rounded-2xl shadow-input border transition-all duration-300 ${
          isDragOver
            ? 'border-primary border-2 bg-primary/5 shadow-lg'
            : 'border-dark-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {attachment && (
            <div className="p-2 pl-4 border-b border-dark-border">
                <div className="flex items-center gap-2 bg-dark-sidebar p-1 rounded-md max-w-xs">
                    <img src={attachment.preview} alt="preview" className="w-10 h-10 rounded-md object-cover" />
                    <p className="text-sm text-text-secondary truncate flex-1">{attachment.file.name}</p>
                    <button onClick={() => setAttachment(null)} className="p-1 text-text-tertiary hover:text-text-primary">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {linkPreviews.length > 0 && (
            <div className="p-2 pl-4 border-b border-dark-border">
                <div className="flex items-center gap-2 bg-dark-sidebar p-1 rounded-md max-w-xs">
                    <img src={linkPreviews[0]?.favicon} alt="favicon" className="w-8 h-8 rounded" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">{linkPreviews[0]?.title}</p>
                        <p className="text-xs text-primary truncate">{linkPreviews[0]?.domain}</p>
                    </div>
                    <button onClick={() => setLinkPreviews([])} className="p-1 text-text-tertiary hover:text-text-primary">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
        <div className="flex items-end p-2 pl-4">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-secondary hover:text-text-primary transition-colors" disabled={isLoading} aria-label="Attach file">
            <PaperclipIcon className="w-5 h-5" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"
                 accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar"/>
          
          <button onClick={handleMicClick} className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-text-secondary hover:text-text-primary'}`} disabled={isLoading} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
              <MicIcon className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={isRecording ? "Recording... speak now" : "Ask anything..."}
            className="flex-1 max-h-48 pl-2 pr-2 py-2.5 resize-none bg-transparent focus:outline-none text-text-primary placeholder:text-text-tertiary text-base"
            rows={1}
            disabled={isLoading || isRecording}
          />
          <div className="flex items-center self-end">
            <button
              onClick={handleSendMessage}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-dark-bg hover:bg-primary-focus disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
              disabled={(!text.trim() && !attachment) || isLoading}
              aria-label="Send message"
            >
              <ArrowUpIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
