# SkinPulse - AI-Powered Skin Analysis Platform

SkinPulse bridges the gap between expensive in-store clinical consultations and everyday skincare tracking. Built as a zero-friction, full-stack web application, SkinPulse allows users to upload a face photo or capture a live webcam snapshot to receive a deep dermatological evaluation, structured morning/evening regimens, exportable clinical PDF reports, and real-time environmental/ingredient safety guidance.

## 🌟 Key Features
* **Two-Stage Vision Validation Pipeline:** Implements a preliminary image guardrail via the Groq vision model to verify real human faces and filter out low-lighting or non-face uploads before running full diagnostic calculations.
* **Multi-Metric Scoring & Diagnostics:** Evaluates skin across four key clinical pillars: **Clarity, Evenness, Hydration, and Texture**, generating tailored AM/PM routines and lifestyle recommendations.
* **Persistent Scan History Dashboard:** Automatically archives client profiles and diagnostic results into a local SQLite database, allowing users to track progress over time.
* **Professional Clinical PDF Export Engine:** Leverages `html2pdf.js` to render live or archived results into clean, standardized letter-format PDF reports.
* **Environmental Advisor & Interactive Map:** Combines Leaflet.js mapping with Open-Meteo live weather telemetry to evaluate microclimate and UV/humidity stress on skin barriers.

## 🛠️ Tech Stack
* **Frontend:** Single-page application architecture using HTML5 Canvas, modern CSS variables, Vanilla JavaScript, and `html2pdf.js`.
* **Backend:** Node.js & Express proxy server handling secure API routing, image processing, and payload parsing.
* **AI Engine:** Groq SDK utilizing high-speed open-source vision models (`qwen/qwen3.6-27b`) for rapid multimodal inference.
* **Database:** Embedded zero-config **SQLite** relational storage engine with JSON serialization for complex clinical schemas.
* **Mapping & Weather:** Leaflet.js interactive maps paired with Open-Meteo live meteorological telemetry.

## 📂 System Architecture & Directory Map

```text
SkinPulse/
│
├── backend/
│   ├── routes/
│   │   ├── skin.js           # Groq vision validation, analysis pipeline & scan endpoints
│   │   ├── environment.js    # Backend API handlers for microclimate and weather telemetry
│   │   └── safety.js         # Backend routes or logic for ingredient clash detection matrices
│   ├── database.js           # SQLite relational table initialization & persistence logic
│   ├── server.js             # Express server entry point & middleware configuration
│   ├── package.json          # Backend dependencies (express, groq-sdk, sqlite3, cors, dotenv)
│   └── package-lock.json     # Exact dependency tree lockfile for reproducible backend installs
│
├── frontend/
│   ├── css/
│   │   └── styles.css        # Minimalist design system, custom cards & layout styling
│   ├── js/
│   │   ├── app.js            # Core UI handling, webcam capture, canvas rendering & PDF export
│   │   ├── dashboard.js      # Scan history rendering, deletion actions & PDF report exports
│   │   ├── environmental.js  # Leaflet map initialization, geocoding & Open-Meteo telemetry
│   │   └── safety.js         # Ingredient clash detection logic & conflict matrices
│   ├── index.html            # Main diagnostic upload and live camera capture view
│   ├── dashboard.html        # Scan history archive & exportable report center
│   ├── environmental.html    # Climate microclimate & skin advisor map view
│   └── safety.html           # Ingredient safety audit engine view
│
└── README.md                 # Project documentation
```

## 🚀 Getting Started Locally
### 1: Prerequisites
Make sure you have Node.js (v18+ recommended) installed on your machine (Download here at https://nodejs.org/en/download)

### 2: Clone the Repository (if you haven't downloaded from github)
```text
git clone https://github.com/svemula10/SkinPulse.git
cd SkinPulse
```
### 3: Create .env file and api key
Create a free API key on https://console.groq.com/home

Create a ```.env ``` file inside the backend folder. Write the following in it:
```text
GROQ_API_KEY="your-groq-api-key-here"
PORT = 5000
```

### 4: Run Frontend and Backend on Two Different Terminals
Open two separate terminal windows to run the services concurrently

Terminal 1: Backend
```text
cd backend

//Install the required backend packages
npm install

//Run the Express server:
node server.js
```

Terminal 2: Frontend
```text
cd frontend

//run server
py -m http.server 3000

// Note: On Mac/Linux, use python3 -m http.server 3000.
```
Open up a browser and go to http://localhost:3000/ to interact with SkinPulse

