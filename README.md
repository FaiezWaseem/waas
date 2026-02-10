# WaaS — WhatsApp Automation as a Service

WaaS is a comprehensive open-source platform designed to automate WhatsApp workflows. It provides a robust infrastructure for building, deploying, and managing AI-powered WhatsApp agents for customer support, engagement, and automated interactions.

The project is built as a monorepo containing a modern **Next.js frontend** and a scalable **Node.js/Express backend**.

## 🚀 Key Features

### 🤖 AI-Powered Agents
- **Smart Responses**: Integrate with OpenAI (GPT models) to provide intelligent, context-aware responses.
- **Custom System Prompts**: Configure agents with specific personas and instructions.
- **Session Management**: Bind specific agents to WhatsApp sessions.

### 📱 WhatsApp Integration
- **Easy Connection**: Scan a QR code to link your WhatsApp account (powered by `@whiskeysockets/baileys`).
- **Real-time Status**: Live connection status updates via WebSockets.
- **Multi-Device Support**: Works with WhatsApp's multi-device feature.

### ⚡ Dashboard & Management
- **Client Dashboard**: Manage agents, view chat history, configure settings, and handle subscriptions.
- **Admin Panel**: User management, blog publishing, and system-wide subscription monitoring.
- **Secure Authentication**: JWT-based authentication for secure access.

### 🛠 Technical Highlights
- **Real-time Communication**: Built with `socket.io` for instant QR code updates and message handling.
- **Responsive UI**: Modern interface built with Tailwind CSS and Framer Motion.
- **Database**: Uses SQLite (`better-sqlite3`) for a lightweight yet fast database solution (easy to swap for other SQL databases).

## 🛠️ Tech Stack

### Frontend (`/client`)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State/Networking**: Axios, Socket.io Client

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **WhatsApp Library**: @whiskeysockets/baileys
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI API
- **Real-time**: Socket.io

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd waas
```

### 2. Backend Setup
Navigate to the server directory, install dependencies, and configure the environment.

```bash
cd server
npm install
```

Create a `.env` file based on the example:
```bash
cp .env.example .env
```
> **Note:** You must provide a valid `OPENAI_API_KEY` in the `.env` file for AI features to work.
> ***Warning:*** The default database is SQLite. For production, switch to MySQL.

Start the backend server:
```bash
npm start
# OR for development with nodemon
npm run dev
```
The server will start on `http://localhost:4000` (default).

### 3. Frontend Setup
Open a new terminal, navigate to the client directory, and install dependencies.

```bash
cd client
npm install
```

Create a `.env.local` file based on the example:
```bash
cp .env.example .env.local
```

Start the frontend development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## 📖 Usage Guide

1.  **Register/Login**: Open the frontend and create a new account.
2.  **Connect WhatsApp**:
    *   Go to **Dashboard > Agents > Connect New Session**.
    *   Scan the QR code using your WhatsApp mobile app (Linked Devices).
    *   Wait for the connection to be established.
3.  **Configure Agent**:
    *   Once connected, create an Agent.
    *   Select an AI model (e.g., GPT-4, GPT-3.5) and define the System Prompt (e.g., "You are a helpful support assistant").
    *   Bind the agent to your active WhatsApp session.
4.  **Test**: Send a message to the connected WhatsApp number from another phone. The AI agent should respond automatically.

## 📂 Project Structure

```
waas/
├── client/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/            # App Router pages (Dashboard, Auth, etc.)
│   │   ├── components/     # Reusable UI components
│   │   └── lib/            # Utilities and API clients
│   └── ...
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── agents.js       # Agent logic
│   │   ├── ai.js           # OpenAI integration
│   │   ├── connectionManager.js # WhatsApp socket handling
│   │   └── ...
│   └── ...
└── README.md               # This file
```

## 🤝 Contributing
Contributions are welcome! Please create issues for bugs or feature requests. Pull requests should be submitted against the `main` branch.

## 📄 License
MIT License.
