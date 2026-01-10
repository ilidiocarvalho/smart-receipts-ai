
# SmartReceipts AI 🧾🤖

An intelligent Personal Finance & Nutrition assistant powered by Google Gemini. This app extracts data from grocery receipts, categorizes items, tracks your budget, and provides AI coaching.

## 🚀 Quick Start

1.  **Clone the repo**: `git clone <your-repo-url>`
2.  **Install dependencies**: `npm install`
3.  **Set up API Key**:
    *   Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
    *   When deploying to **Vercel**, add an environment variable named `API_KEY`.
4.  **Run locally**: `npm start`

## 🛠️ Tech Stack

*   **Frontend**: React (TSX) + Tailwind CSS
*   **AI Engine**: Google Gemini API (@google/genai)
*   **Charts**: Recharts
*   **Storage**: LocalStorage (Current) / Firebase Firestore (Planned)

## 🔒 Security & Privacy

The app processes images locally and sends them to the Gemini API using your private API key. Data is stored in your browser's `localStorage` unless Cloud Sync is enabled.
