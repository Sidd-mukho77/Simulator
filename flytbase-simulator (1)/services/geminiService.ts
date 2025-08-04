import { GoogleGenAI, Type } from '@google/genai';
import type { Mission, Conflict, Waypoint } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        modifiedMission: {
            type: Type.OBJECT,
            properties: {
                droneId: {
                    type: Type.STRING,
                    description: "The ID of the drone whose mission was modified.",
                },
                waypoints: {
                    type: Type.ARRAY,
                    description: "The complete new list of waypoints for the modified mission.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            lat: { type: Type.NUMBER },
                            lng: { type: Type.NUMBER },
                            alt: { type: Type.NUMBER },
                        },
                        required: ["lat", "lng", "alt"],
                    },
                },
            },
            required: ["droneId", "waypoints"],
        },
    },
     required: ["modifiedMission"],
};

export async function getCollisionAvoidanceSuggestion(
    missions: Mission[],
    conflict: Conflict
): Promise<{ droneId: string, waypoints: Waypoint[] } | null> {
    
    const missionToModify = missions.find(m => m.droneId === conflict.droneIds[0]);
    const otherMission = missions.find(m => m.droneId === conflict.droneIds[1]);

    if (!missionToModify || !otherMission) {
        throw new Error("Could not find one or both conflicting missions.");
    }

    const systemInstruction = `You are an expert drone flight controller. Your task is to resolve a predicted collision between two drones by modifying one of their flight paths.
Analyze the provided missions and the specific conflict point.
Your goal is to adjust the flight path of the first drone ('missionToModify') to safely avoid the second drone ('otherMission').
The primary method of avoidance should be a smooth altitude change. Create an "arc" over the conflict point by inserting 1 to 3 new waypoints. The new path should be logical and efficient.
The drone must fly over the other drone, never under. The new altitude at the conflict point should be at least 20 feet (approx 6 meters) higher than the other drone's altitude.
After the avoidance maneuver, the drone should return to its original flight path's altitude to continue its mission.
Do not change the start or end points of the original mission.
Provide your answer ONLY in the specified JSON format.`;

    const prompt = `
        Here is the situation:

        1. All Missions:
        ${JSON.stringify(missions, null, 2)}

        2. Mission to Modify:
        - Drone ID: ${missionToModify.droneId}
        - Current Waypoints: ${JSON.stringify(missionToModify.waypoints, null, 2)}

        3. Other Mission (for reference, do not modify):
        - Drone ID: ${otherMission.droneId}
        - Waypoints: ${JSON.stringify(otherMission.waypoints, null, 2)}

        4. The Conflict:
        - A collision is predicted at time ${conflict.time}.
        - Location (lat, lng, alt): ${conflict.location.lat}, ${conflict.location.lng}, ${conflict.location.alt}m.
        - The drones are ${conflict.droneIds.join(' and ')}.
        - My script predicts they will be ${conflict.distance.toFixed(1)} feet apart.

        Please provide a new set of waypoints for drone ${missionToModify.droneId} to avoid this collision.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.2,
            }
        });

        const text = response.text.trim();
        if (!text) {
             throw new Error("Received an empty response from the AI.");
        }

        const parsedJson = JSON.parse(text);

        if (parsedJson.modifiedMission && parsedJson.modifiedMission.waypoints.length > 1) {
             return parsedJson.modifiedMission;
        } else {
            throw new Error("AI response was missing the required 'modifiedMission' data.");
        }
    } catch (e) {
        console.error("Error calling Gemini API:", e);
        if (e instanceof Error) {
            throw new Error(`AI suggestion failed: ${e.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the AI.");
    }
}