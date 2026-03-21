# 🛠 Installation & Run Guide: Arena Unified

Follow these steps to get the full-stack production environment running on your local machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
1.  **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/) (Required for Nakama & PostgreSQL).
2.  **Node.js (v18+)**: [Download here](https://nodejs.org/) (Required for Frontend, Backend TS, and Express API).
3.  **NPM**: (Included with Node.js).

---

## 🚀 Step 1: Start the Infrastructure

This command spins up the **Nakama Game Server** and the **PostgreSQL** database.

```bash
# In the project root directory
docker-compose up -d
```

---

## ⚙️ Step 2: Build & Deploy Backend Logic

The game logic is written in TypeScript and must be compiled to JavaScript for Nakama to execute it.

```bash
cd backend
npm install
npm run build
# Now restart Nakama to pick up the new logic
docker-compose restart nakama
```

---

## 🎨 Step 3: Launch the Game Frontend

This launches the React development server.

```bash
# Open a NEW terminal tab
cd frontend
npm install
npm run dev
```

*Access:* Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📊 Step 4: Launch the Analytics API (Optional)

This starts the companion REST service using TypeORM.

```bash
# Open a NEW terminal tab
cd express-api
npm install
npm run dev
```

*Access:* Test at [http://localhost:3001/health](http://localhost:3001/health).

---

## 🧪 Testing Multiplayer Functionality

To simulate a real match without having two computers:

1.  Open [http://localhost:5173](http://localhost:5173) in your **Regular Browser Window**.
2.  Open [http://localhost:5173](http://localhost:5173) in an **Incognito/Private Tab**.
3.  In both windows:
    - Click **"Establish Uplink"** to authenticate.
    - Click **"Join Arena"** to enter the matchmaker.
4.  The server will pair you within 3-5 seconds and the authoritative match will begin!
