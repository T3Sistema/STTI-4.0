import React from 'react';

interface ToolboxViewerProps {
    url: string;
    onClose: () => void;
}

const ToolboxViewer: React.FC<ToolboxViewerProps> = ({ url, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 bg-dark-background flex flex-col animate-fade-in">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-dark-border">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-dark-secondary hover:bg-dark-card/50 transition-colors"
                >
                    &larr; Voltar
                </button>
            </header>
            <div className="flex-grow">
                <iframe
                    src={url}
                    title="ToolBox Triad3"
                    className="w-full h-full border-0"
                    allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default ToolboxViewer;
