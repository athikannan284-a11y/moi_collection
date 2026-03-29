# Moi Collection Manager

A professional, full-stack web application designed for high-speed tracking and management of "Moi" (money) collections for events like weddings, festivals, etc.

## 🚀 Getting Started

The project is divided into two main parts:

### **1. Frontend (Client)**
- **Technology**: React, Vite, Lucide Icons, Vanilla CSS
- **Path**: `/client`
- **Features**: 
    - Premium "Glow UI" with glassmorphism design.
    - Sequential "Enter-to-focus" for ultra-fast data entry.
    - Real-time search and statistics (entry count & total amount).
    - Professional printing mode for records.

### **2. Backend (Server)**
- **Technology**: Node.js, Express, SQLite3
- **Path**: `/server`
- **Features**: 
    - RESTful API for managing folders and entries.
    - Persistant SQLite database (`moi.db`).

## 🛠️ How to Run

### **Step 1: Start the Backend Server**
```bash
cd server
npm install
npm start
```
*The server will run on `http://localhost:5000`.*

### **Step 2: Start the Frontend Client**
```bash
cd client
npm install
npm run dev
```
*The application will be accessible at `http://localhost:5173/`.*

## 🔒 Login Credentials
- **Username**: `admin`
- **Password**: `admin123`

---
*Created with focus on speed, reliability, and professional aesthetics.*
