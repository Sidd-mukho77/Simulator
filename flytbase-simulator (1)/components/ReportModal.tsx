
import React from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportContent: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, reportContent }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flight-resolution-report.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-dark-surface w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl border border-dark-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-dark-border">
          <h2 className="text-xl font-bold text-light-text">Flight Resolution Report</h2>
          <button onClick={onClose} className="text-medium-text hover:text-light-text text-2xl">&times;</button>
        </header>
        
        <main className="flex-grow p-6 overflow-y-auto">
            <pre className="bg-gray-800 p-4 rounded-md text-sm text-light-text whitespace-pre-wrap font-mono">
                {reportContent}
            </pre>
        </main>
        
        <footer className="flex justify-end p-4 border-t border-dark-border space-x-3">
          <button 
            onClick={onClose} 
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handleDownload} 
            className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Download (.md)
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ReportModal;
