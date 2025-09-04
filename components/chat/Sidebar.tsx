import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Conversation } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import {
    SearchIcon, EditIcon, FilesIcon, ProjectsIcon, HistoryIcon, ChevronDoubleLeftIcon,
    TrashIcon, CheckIcon, XIcon, MoreHorizontalIcon, SettingsIcon,
} from '../ui/Icons';
import { ConfirmationModal } from '../ui/ConfirmationModal';

type ViewType = 'chat' | 'files' | 'projects';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  currentView: ViewType;
  onSetView: (view: ViewType) => void;
}

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${active ? 'bg-dark-card text-text-primary' : 'text-text-secondary hover:bg-dark-card hover:text-text-primary'}`}>
        {icon}
        <span>{label}</span>
    </button>
);

const HistoryItem = ({
    conversation,
    isActive,
    onSelect,
    onRename,
    onDelete,
    openMenuId,
    setOpenMenuId,
    editingMenuId,
    setEditingMenuId
}: {
    conversation: Conversation,
    isActive: boolean,
    onSelect: (id: string) => void,
    onRename: (id: string, title: string) => void,
    onDelete: (id: string) => void,
    openMenuId: string | null,
    setOpenMenuId: (id: string | null) => void,
    editingMenuId: string | null,
    setEditingMenuId: (id: string | null) => void
}) => {
    const [title, setTitle] = useState(conversation.title);
    const [isConfirmingDelete, setConfirmingDelete] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isEditing = editingMenuId === conversation.id;

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (title.trim() && title.trim() !== conversation.title) {
            onRename(conversation.id, title.trim());
        }
        setEditingMenuId(null);
    };

    const startRename = () => {
        setEditingMenuId(conversation.id);
    };

    return (
        <div className={`group flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-dark-card/70' : 'hover:bg-dark-card/50'}`}>
            {isEditing ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                        ref={inputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        className="flex-1 bg-dark-border text-sm px-2 py-1 rounded-md focus:outline-none min-w-0 truncate"
                    />
                    <button onClick={handleSave} className="flex-shrink-0 p-1 text-green-500 hover:bg-dark-border rounded-md">
                        <CheckIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setEditingMenuId(null)} className="flex-shrink-0 p-1 text-red-500 hover:bg-dark-border rounded-md">
                        <XIcon className="w-4 h-4"/>
                    </button>
                </div>
            ) : (
                <>
                    <button
                        onClick={() => onSelect(conversation.id)}
                        className="flex-1 text-left text-sm text-text-secondary hover:text-text-primary truncate transition-colors min-w-0"
                    >
                        {conversation.title}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={startRename}
                            className="p-1.5 text-text-tertiary hover:text-blue-500 hover:bg-dark-border rounded-md transition-colors"
                            title="Rename chat"
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setConfirmingDelete(true)}
                            className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-dark-border rounded-md transition-colors"
                            title="Delete chat"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}

            <ConfirmationModal
                isOpen={isConfirmingDelete}
                title="Delete Chat?"
                message={`Are you sure you want to delete "${conversation.title}"?`}
                onConfirm={() => { onDelete(conversation.id); setConfirmingDelete(false); }}
                onCancel={() => setConfirmingDelete(false)}
            />
        </div>
    );
};

const UserProfile = ({ onToggleSidebar, onOpenSettings }: { onToggleSidebar: () => void, onOpenSettings: () => void }) => {
    const { user, logout, loading } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Show loading state if still checking authentication
    if (loading) {
        return (
            <div className="p-3 border-t border-dark-border">
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
            </div>
        );
    }

    // Show not authenticated state
    if (!user) {
        return (
            <div className="p-3 border-t border-dark-border">
                <div className="text-center text-sm text-text-secondary">
                    <p>Not signed in</p>
                    <p className="text-xs mt-1">Please refresh the page</p>
                </div>
            </div>
        );
    }

    const initials = `${user.name[0] || ''}${user.surname[0] || ''}`.toUpperCase();

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            const result = await logout();
            if (!result.success) {
                console.error('Logout failed:', result.error);
                // Force logout even if API call fails
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect on error
            window.location.href = '/login';
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="p-3 border-t border-dark-border">
            <div className="flex items-center justify-between mb-3">
                 <button onClick={onOpenSettings} className="flex items-center gap-3 text-left w-full hover:bg-dark-card p-2 rounded-md transition-colors">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm border-2 border-primary"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-focus rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                            {initials}
                        </div>
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                        <p className="font-semibold text-sm text-text-primary truncate">{`${user.name} ${user.surname}`}</p>
                        <p className="text-xs text-text-secondary truncate">{user.email}</p>
                    </div>
                 </button>
                 <button onClick={onToggleSidebar} className="p-2 text-text-tertiary hover:text-text-primary rounded-md transition-colors">
                    <ChevronDoubleLeftIcon className="w-5 h-5"/>
                 </button>
            </div>

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoggingOut ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent"></div>
                        <span className="text-sm font-medium">Logging out...</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
                    </>
                )}
            </button>
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, conversations, activeConversationId, onSelectConversation, onNewChat, onRenameConversation, onDeleteConversation, onOpenSettings, currentView, onSetView }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
                setEditingMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredConversations = useMemo(() => 
        conversations.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
    , [conversations, searchTerm]);
  
    return (
        <aside ref={sidebarRef} className={`bg-dark-sidebar text-text-primary flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-96 border-r border-dark-border`}>
            <div className="p-4 flex items-center justify-between border-b border-dark-border h-16">
                 <button onClick={onNewChat} className="flex items-center gap-2 px-3 py-1.5 bg-dark-card border border-dark-border rounded-full text-sm font-medium text-text-secondary hover:text-text-primary hover:border-gray-600 transition-colors">
                    <EditIcon className="w-4 h-4" />
                    <span>New Chat</span>
                </button>
            </div>

            <div className="p-3">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"/>
                    <input 
                        type="text" 
                        placeholder="Search history..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-dark-card border border-dark-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 space-y-1.5">
                <NavItem icon={<EditIcon className="w-5 h-5"/>} label="Ask" onClick={onNewChat} active={currentView === 'chat' && !activeConversationId} />
                <NavItem icon={<FilesIcon className="w-5 h-5"/>} label="Files" onClick={() => onSetView('files')} active={currentView === 'files'} />
                <NavItem icon={<ProjectsIcon className="w-5 h-5"/>} label="Projects" onClick={() => onSetView('projects')} active={currentView === 'projects'} />
                
                <div className="pt-4">
                    <h3 className="px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2 flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4" />
                        History
                    </h3>
                    <div className="space-y-1">
                        {filteredConversations.sort((a,b) => b.createdAt - a.createdAt).map(conv => (
                            <HistoryItem
                                key={conv.id}
                                conversation={conv}
                                isActive={currentView === 'chat' && conv.id === activeConversationId}
                                onSelect={onSelectConversation}
                                onRename={onRenameConversation}
                                onDelete={onDeleteConversation}
                                openMenuId={openMenuId}
                                setOpenMenuId={setOpenMenuId}
                                editingMenuId={editingMenuId}
                                setEditingMenuId={setEditingMenuId}
                            />
                        ))}
                    </div>
                </div>
            </nav>

            <div className="border-t border-dark-border mt-auto">
                <UserProfile onToggleSidebar={onToggle} onOpenSettings={onOpenSettings} />
            </div>
        </aside>
    );
};
