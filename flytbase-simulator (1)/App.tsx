
import React, { useState, useCallback } from 'react';
import type { Drone, Mission, Waypoint, Conflict } from './types';
import { DroneStatus, MissionStatus } from './types';
import DroneRegistration from './components/DroneRegistration';
import DroneList from './components/DroneList';
import MissionPlanner from './components/MissionPlanner';
import MissionList from './components/MissionList';
import ConflictReport from './components/ConflictReport';
import MapView from './components/MapView';
import Path3DGraph from './components/Path3DGraph';
import ReportModal from './components/ReportModal';
import { detectCollisions } from './services/collisionService';
import { getCollisionAvoidanceSuggestion } from './services/geminiService';
import { generateMarkdownReport } from './services/reportService';


const PATH_COLORS = ['#00A8E8', '#48D1CC', '#32CD32', '#9370DB', '#FF69B4', '#20B2AA'];

const App: React.FC = () => {
    const [drones, setDrones] = useState<Drone[]>([
        { id: 'DR-Alpha', status: DroneStatus.Idle },
        { id: 'DR-Beta', status: DroneStatus.Idle },
        { id: 'DR-Gamma', status: DroneStatus.Charging },
    ]);
    const [missions, setMissions] = useState<Mission[]>([]);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisTriggered, setAnalysisTriggered] = useState(false);
    const [currentPlanningWaypoints, setCurrentPlanningWaypoints] = useState<Partial<Waypoint>[]>([]);

    // State for AI suggestions
    const [suggestedMission, setSuggestedMission] = useState<Mission | null>(null);
    const [isSuggesting, setIsSuggesting] = useState<string | null>(null); // Stores ID of conflict being processed
    const [suggestionError, setSuggestionError] = useState<string | null>(null);
    const [activeConflict, setActiveConflict] = useState<Conflict | null>(null);

    // State for reporting
    const [resolvedConflicts, setResolvedConflicts] = useState<{conflict: Conflict, originalMission: Mission, suggestedMission: Mission}[]>([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContent, setReportContent] = useState('');


    const handleAddDrone = (id: string) => {
        const newDrone: Drone = { id, status: DroneStatus.Idle };
        setDrones(prev => [...prev, newDrone]);
    };

    const handleAddMission = useCallback((missionData: Omit<Mission, 'id' | 'status' | 'pathColor'>) => {
        const newMission: Mission = {
            ...missionData,
            id: `M-${(missions.length + 1).toString().padStart(3, '0')}`,
            status: MissionStatus.Pending,
            pathColor: PATH_COLORS[missions.length % PATH_COLORS.length],
        };
        setMissions(prev => [...prev, newMission]);
        setDrones(prev => prev.map(d => d.id === missionData.droneId ? { ...d, status: DroneStatus.Active } : d));
        setCurrentPlanningWaypoints([]);
    }, [missions]);
    
    const handleAnalyzeConflicts = async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        setConflicts([]);
        setAnalysisTriggered(true);
        setSuggestedMission(null);
        setResolvedConflicts([]); // Clear previous resolutions

        // Reset mission statuses
        setMissions(m => m.map(mission => ({...mission, status: MissionStatus.Pending})));

        try {
            const detectedConflicts = await detectCollisions(missions);
            setConflicts(detectedConflicts);
            if (detectedConflicts.length > 0) {
              // Mark conflicted missions
              const conflictedDroneIds = new Set(detectedConflicts.flatMap(c => c.droneIds));
              setMissions(prevMissions => prevMissions.map(m => 
                conflictedDroneIds.has(m.droneId) ? {...m, status: MissionStatus.Conflict} : m
              ));
            }
        } catch (error) {
            if (error instanceof Error) {
                setAnalysisError(error.message);
            } else {
                setAnalysisError("An unknown error occurred during analysis.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleMapClick = useCallback((latLng: { lat: number; lng: number }) => {
        setCurrentPlanningWaypoints(prev => [...prev, { ...latLng, alt: 50 }]);
    }, []);

    const handleRequestSuggestion = async (conflict: Conflict) => {
        const conflictId = `${conflict.time}-${conflict.droneIds.join('-')}`;
        setIsSuggesting(conflictId);
        setActiveConflict(conflict);
        setSuggestionError(null);
        setSuggestedMission(null);

        try {
            const suggestion = await getCollisionAvoidanceSuggestion(missions, conflict);
            if (suggestion) {
                const originalMission = missions.find(m => m.droneId === suggestion.droneId);
                if (originalMission) {
                    setSuggestedMission({ ...originalMission, waypoints: suggestion.waypoints });
                } else {
                     throw new Error("Suggested mission's drone ID does not match any existing mission.");
                }
            } else {
                throw new Error("AI could not generate a valid suggestion.");
            }
        } catch (error) {
            if (error instanceof Error) {
                setSuggestionError(error.message);
            } else {
                setSuggestionError("An unknown error occurred while getting a suggestion.");
            }
        } finally {
            setIsSuggesting(null);
        }
    }

    const handleApplySuggestion = () => {
        if (!suggestedMission || !activeConflict) return;

        const originalMission = missions.find(m => m.id === suggestedMission.id);
        if (!originalMission) return;

        // Add to resolutions list for the report
        setResolvedConflicts(prev => [...prev, {
            conflict: activeConflict,
            originalMission: originalMission,
            suggestedMission: suggestedMission,
        }]);
        
        // Update the main missions state
        setMissions(prevMissions => 
            prevMissions.map(m => m.id === suggestedMission.id ? suggestedMission : m)
        );

        // Remove the just-resolved conflict from the list
        setConflicts(prev => prev.filter(c => c.time !== activeConflict.time || c.droneIds.join('') !== activeConflict.droneIds.join('')));
        
        setSuggestedMission(null);
        setActiveConflict(null);
        setSuggestionError(null);
    }

    const handleDiscardSuggestion = () => {
        setSuggestedMission(null);
        setActiveConflict(null);
        setSuggestionError(null);
    }

    const handleGenerateReport = () => {
        const content = generateMarkdownReport(resolvedConflicts);
        setReportContent(content);
        setIsReportModalOpen(true);
    }

    const validPlanningWaypoints = currentPlanningWaypoints.filter(
        (wp): wp is Waypoint => wp.lat != null && wp.lng != null && wp.alt != null
    );
    
    const hasResolvedConflicts = resolvedConflicts.length > 0;

    return (
        <div className="min-h-screen flex flex-col p-4 gap-4 bg-dark-bg">
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                reportContent={reportContent}
            />
            <header className="text-center">
                <h1 className="text-4xl font-bold text-light-text tracking-wider">
                    Flytbase <span className="text-brand-primary">Simulator</span>
                </h1>
                <p className="text-medium-text mt-1">Plan and simulate drone missions with AI-powered conflict detection</p>
            </header>

            <main className="flex-grow flex flex-col lg:flex-row gap-4">
                {/* Left Panel */}
                <aside className="w-full lg:w-1/3 flex flex-col gap-4">
                    <DroneRegistration onAddDrone={handleAddDrone} drones={drones} />
                    <DroneList drones={drones} />
                    <MissionPlanner
                        drones={drones}
                        onAddMission={handleAddMission}
                        planningWaypoints={currentPlanningWaypoints}
                        onPlanningWaypointsChange={setCurrentPlanningWaypoints}
                    />
                </aside>

                {/* Right Panel */}
                <section className="w-full lg:w-2/3 flex flex-col gap-4">
                    <div className="flex-grow h-64 md:h-1/2">
                         <MapView 
                            missions={missions} 
                            currentWaypoints={validPlanningWaypoints}
                            suggestedMission={suggestedMission}
                            onMapClick={handleMapClick}
                         />
                    </div>
                    <div className="flex-grow h-64 md:h-1/2">
                         <Path3DGraph 
                            missions={missions} 
                            currentWaypoints={validPlanningWaypoints}
                            conflicts={conflicts}
                            suggestedMission={suggestedMission}
                         />
                    </div>
                </section>
            </main>
            
            {/* Bottom Panel */}
            <footer className="w-full">
                <MissionList missions={missions} onAnalyze={handleAnalyzeConflicts} isAnalyzing={isAnalyzing}/>
                <ConflictReport 
                    conflicts={conflicts} 
                    isAnalyzing={isAnalyzing} 
                    error={analysisError}
                    analysisTriggered={analysisTriggered} 
                    hasResolvedConflicts={hasResolvedConflicts}
                    onSuggestFix={handleRequestSuggestion}
                    isSuggesting={isSuggesting}
                    suggestionError={suggestionError}
                    suggestedMission={suggestedMission}
                    onApplySuggestion={handleApplySuggestion}
                    onDiscardSuggestion={handleDiscardSuggestion}
                    onGenerateReport={handleGenerateReport}
                />
            </footer>
        </div>
    );
};

export default App;