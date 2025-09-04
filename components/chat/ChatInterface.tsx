import React, { useState } from 'react';
import { ChatInput } from './ChatInput';
import { Sidebar } from './Sidebar';
import { GrokLogo, ClipboardListIcon } from '../ui/Icons';
import { Header } from './Header';
import { useChat } from '../../hooks/useChat';
import { SettingsModal } from '../settings/SettingsModal';
import { ChatView } from './ChatView';
import { useAuth } from '../../hooks/useAuth';
import { FilesView } from '../files/FilesView';
import { ProjectsView } from '../projects/ProjectsView';
import { useProjects } from '../../hooks/useProjects';

// Import the CK logo image
import ckLogo from '../../assets/unnamed.webp';

type ViewType = 'chat' | 'files' | 'projects';

const EmptyState = ({ onSetView }: { onSetView: (view: ViewType) => void }) => {
    const { tasks } = useProjects();
    const pendingTasksCount = tasks.filter(task => !task.completed).length;

    return (
        <div className="flex flex-col items-center justify-center text-center w-full flex-grow p-4">
            <img
                src={ckLogo}
                alt="CK AI Assistant Logo"
                className="w-24 h-24 object-contain mb-4 rounded-lg shadow-lg"
            />
            <h1 className="text-5xl font-bold mt-4 text-white">CK AI Assistant - Ceku</h1>
            <p className="text-text-secondary mt-2">How can I help you today?</p>
            
            {pendingTasksCount > 0 && (
                <button 
                    onClick={() => onSetView('projects')}
                    className="mt-8 bg-dark-card border border-dark-border rounded-lg p-4 max-w-sm w-full text-left hover:border-primary/50 transition-all duration-300 transform hover:scale-105"
                    aria-label={`View your ${pendingTasksCount} pending tasks`}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-dark-sidebar p-3 rounded-full">
                            <ClipboardListIcon className="w-6 h-6 text-primary"/>
                        </div>
                        <div>
                            <p className="font-semibold text-text-primary">You have {pendingTasksCount} pending task{pendingTasksCount > 1 ? 's' : ''}</p>
                            <p className="text-sm text-text-secondary">Click here to view your projects.</p>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
};


export const ChatInterface: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<ViewType>('chat');
  const { user } = useAuth();
  const {
      conversations,
      activeConversation,
      sendMessage,
      startNewChat,
      selectConversation,
      deleteConversation,
      renameConversation,
      isLoading,
  } = useChat();

  const handleSendMessage = (text: string, file?: File) => {
    // Allow sending if there's either text content OR a file attachment
    if (!text.trim() && !file) return;
    sendMessage(text, file);
  };
  
  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setView('chat');
  }

  const handleNewChat = () => {
      startNewChat();
      setView('chat');
  }

  const renderView = () => {
      switch (view) {
          case 'chat':
              return activeConversation ? (
                  <ChatView
                      key={activeConversation.id}
                      conversation={activeConversation}
                      user={user}
                      isLoading={isLoading}
                  />
              ) : <EmptyState onSetView={setView} />;
          case 'files':
              return <FilesView />;
          case 'projects':
              return <ProjectsView />;
          default:
              return <EmptyState onSetView={setView} />;
      }
  }

  return (
    <div className="h-screen w-full text-text-primary overflow-hidden flex">
      <Sidebar 
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        currentView={view}
        onSetView={setView}
      />
      <div className={`h-full flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-96' : 'ml-0'}`}>
        <Header
            onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
            title={view === 'chat' ? activeConversation?.title : view.charAt(0).toUpperCase() + view.slice(1)}
            onSetView={setView}
        />
        <main className="flex-1 flex flex-col justify-end overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-4">
                {renderView()}
            </div>
            {view === 'chat' && (
                <div className="pb-6 pt-2 shrink-0">
                    <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
            )}
        </main>
      </div>
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
};
