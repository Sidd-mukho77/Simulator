
import React from 'react';
import type { Conflict, Mission } from '../types';
import { AlertTriangleIcon, CheckCircleIcon } from './icons';

interface ConflictReportProps {
  conflicts: Conflict[];
  isAnalyzing: boolean;
  error: string | null;
  analysisTriggered: boolean;
  hasResolvedConflicts: boolean;
  onSuggestFix: (conflict: Conflict) => void;
  isSuggesting: string | null; // conflict ID being processed
  suggestionError: string | null;
  suggestedMission: Mission | null;
  onApplySuggestion: () => void;
  onDiscardSuggestion: () => void;
  onGenerateReport: () => void;
}

const ConflictReport: React.FC<ConflictReportProps> = ({ 
    conflicts, isAnalyzing, error, analysisTriggered, hasResolvedConflicts,
    onSuggestFix, isSuggesting, suggestionError, 
    suggestedMission, onApplySuggestion, onDiscardSuggestion,
    onGenerateReport
}) => {
  if (!analysisTriggered) {
    return (
      <div className="bg-dark-surface p-4 rounded-lg shadow-lg mt-4 text-center">
        <h3 className="text-lg font-bold mb-2 text-light-text">Conflict Analysis</h3>
        <p className="text-medium-text">Click "Analyze Conflicts" to check for potential issues in the mission queue.</p>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="bg-dark-surface p-4 rounded-lg shadow-lg mt-4 text-center">
        <h3 className="text-lg font-bold mb-2 text-light-text">Conflict Analysis</h3>
        <div className="flex justify-center items-center space-x-2 text-brand-primary">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Analyzing flight paths...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="bg-red-900 border border-red-500 p-4 rounded-lg shadow-lg mt-4">
            <div className="flex items-center space-x-3">
                <AlertTriangleIcon className="w-8 h-8 text-red-300" />
                <div>
                    <h3 className="text-lg font-bold text-red-200">Analysis Error</h3>
                    <p className="text-red-300">{error}</p>
                </div>
            </div>
        </div>
    );
  }
  
  const activeConflictId = suggestedMission ? `${suggestedMission.droneId}` : null;

  return (
    <div className="bg-dark-surface p-4 rounded-lg shadow-lg mt-4">
      <h3 className="text-lg font-bold mb-3 text-light-text">Conflict Report</h3>
      {conflicts.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
          {conflicts.map((conflict, index) => {
            const conflictId = `${conflict.time}-${conflict.droneIds.join('-')}`;
            const isRedAlert = conflict.severity === 'Red';
            const bgColor = isRedAlert ? 'bg-red-900/50 border-red-600/60' : 'bg-yellow-900/50 border-yellow-600/60';
            const textColor = isRedAlert ? 'text-red-200' : 'text-yellow-200';
            const textMutedColor = isRedAlert ? 'text-red-300' : 'text-yellow-300';
            const isThisConflictSuggesting = isSuggesting === conflictId;
            const hasSuggestionForThisConflict = suggestedMission?.droneId === conflict.droneIds[0] || suggestedMission?.droneId === conflict.droneIds[1];
            
            return (
              <div key={index} className={`${bgColor} p-3 rounded-md border`}>
                  <div className="flex items-start space-x-3">
                      <AlertTriangleIcon className={`w-5 h-5 ${textColor} mt-1 flex-shrink-0`} />
                      <div className="flex-grow">
                          <p className={`font-bold ${textColor}`}>
                              {isRedAlert ? 'Collision Alert' : 'Proximity Warning'}: {conflict.droneIds.join(' & ')}
                          </p>
                          <p className={`text-sm ${textMutedColor}`}>
                              Time: {conflict.time} | Est. Distance: {conflict.distance.toFixed(1)}ft
                          </p>
                          <p className={`text-sm ${textMutedColor} mt-1`}>{conflict.description}</p>
                      </div>
                  </div>
                  {isRedAlert && (
                    <div className="mt-3 pt-3 border-t border-red-500/30">
                      {hasSuggestionForThisConflict ? (
                        <div className="text-center">
                            <p className="text-sm text-fuchsia-300 mb-2 font-semibold">AI has proposed a fix. View it on the graph.</p>
                            <div className="flex justify-center space-x-2">
                                <button onClick={onApplySuggestion} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">Apply Fix</button>
                                <button onClick={onDiscardSuggestion} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded-md transition-colors">Discard</button>
                            </div>
                        </div>
                      ) : (
                         isThisConflictSuggesting ? (
                            <div className="flex justify-center items-center space-x-2 text-fuchsia-300">
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-semibold">AI is analyzing...</span>
                            </div>
                         ) : (
                            <button onClick={() => onSuggestFix(conflict)} disabled={!!suggestedMission} className="w-full bg-fuchsia-800 hover:bg-fuchsia-900 text-white text-sm font-bold py-2 px-3 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                                Suggest Fix with AI
                            </button>
                         )
                      )}
                      {suggestionError && !isSuggesting && !hasSuggestionForThisConflict && (
                          <p className="text-center text-red-400 text-xs mt-2">{suggestionError}</p>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-3 bg-green-900 border border-green-700 text-green-200 p-4 rounded-md">
            <div className="flex items-center space-x-3">
                <CheckCircleIcon className="w-6 h-6" />
                <p className="font-semibold">No conflicts detected. All flight paths are clear.</p>
            </div>
            {hasResolvedConflicts && (
                <button onClick={onGenerateReport} className="bg-brand-secondary hover:bg-brand-primary text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Generate Flight Resolution Report
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default ConflictReport;
