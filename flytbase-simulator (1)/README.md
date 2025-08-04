
# Flytbase Simulator

Flytbase Simulator is a sophisticated web-based application for planning, visualizing, and de-conflicting drone flight missions. It provides a comprehensive dashboard featuring an interactive map for waypoint planning, a real-time 3D path visualizer, and an intelligent assistant that detects and helps resolve potential mid-air conflicts.

## Features

- **Drone Fleet Management:** Register new drones to your fleet and view their real-time status (Idle, Active, Charging).
- **Interactive Mission Planning:** Assign missions to available drones, define flight paths by clicking on an interactive map or entering coordinates manually, and set mission start times and durations.
- **Return-to-Home (RTH):** Automatically append a final return leg to a mission with a single checkbox.
- **Live 2D Map View:** Utilizes the Google Maps API to display all assigned and planned mission paths on a satellite map with a dark theme that's easy on the eyes.
- **Interactive 3D Path Graph:** Visualizes flight paths in a fully interactive 3D cube. This view clearly shows altitude changes and spatial relationships between drone paths.
- **Deterministic Conflict Detection:** A powerful, script-based analysis engine simulates the entire flight schedule second-by-second to identify potential conflicts based on 3D proximity.
  - **Yellow Warning:** Drones predicted to be within 10 to 20 feet of each other.
  - **Red Alert:** Drones predicted to be within 10 feet of each other, indicating a high risk of collision.
- **AI-Powered Collision Avoidance:** For high-risk "Red" alerts, users can request a solution from an AI flight controller (powered by the Google Gemini API). The AI analyzes the conflict and suggests a new, safer flight path by creating a smooth altitude-based avoidance maneuver.
- **Flight Resolution Reporting:** After resolving conflicts, generate and download a detailed Markdown report that summarizes each conflict and the "before and after" waypoints of the AI-generated fix.

## Technology Stack

- **Frontend Framework:** React with TypeScript
- **Styling:** Tailwind CSS
- **Mapping:** Google Maps JavaScript API via `@googlemaps/react-wrapper`
- **3D Visualization:** `react-three-fiber` & `three.js`
- **AI Integration:** Google Gemini API via `@google/genai`
- **Module Resolution:** The project uses a modern "no-build-step" approach with an `importmap` in `index.html` and `esm.sh` for CDN-based dependency management.

## Setup and Execution

Follow these instructions to run the Flytbase Simulator on your local machine.

### Prerequisites

- A modern web browser that supports ES modules and import maps (e.g., Chrome, Firefox, Edge).
- A local web server to serve the files. `npx serve` is a simple option. If you don't have Node.js/npm, you can use Python's built-in server.

### 1. Configure API Keys

The application requires two separate API keys to function correctly.

**A. Google Maps API Key**

This key is required to render the interactive 2D map.

1.  Open the file: `components/MapView.tsx`
2.  Find the line (around line 250): `const apiKey = "AIzaSyCJoGx5JegjBMcY_BcrNjtEjGJDvV_oriM";`
3.  Replace the placeholder key with your valid Google Maps JavaScript API key.

**B. Google Gemini API Key**

This key is required for the "Suggest Fix with AI" feature.

1.  Open the file: `services/geminiService.ts`
2.  Find the line (around line 5): `const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });`
3.  Replace `process.env.API_KEY` with your string literal API key. The line should look like this:
    ```javascript
    const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_API_KEY_HERE" });
    ```
> **Note:** Hardcoding API keys directly into client-side code is not secure for production environments. This method is suitable only for local development and demonstration.

### 2. Run the Application

1.  **Download Files:** Download all the project files and place them in a single directory.
2.  **Start a Local Server:** Open your terminal or command prompt, navigate to the project directory, and run one of the following commands:

    **Using Node.js/npx:**
    ```bash
    npx serve
    ```

    **Using Python 3:**
    ```bash
    python -m http.server
    ```
3.  **Open in Browser:** The terminal will output a local URL, typically `http://localhost:3000` or `http://localhost:8000`. Open this URL in your web browser to start using the Flytbase Simulator.
