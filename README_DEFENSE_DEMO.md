# 🎓 FOODFIX (Lamion AI) — Thesis Defense Quick Start Guide

Welcome to the **FoodFix & Lamion AI** presentation and technical debugging suite! This package is prepared for a **one-time setup** on your laptop so you can demonstrate the full application (Admin, Staff, Customer, and AI subsystems) with zero friction during your defense.

---

## ⚡ 1-Minute Quick Start (Windows)

1. **Extract this ZIP folder** to any location (e.g. `Desktop` or `Documents`).
2. **Double-click `run-demo.bat`**.
   - The script automatically checks Node.js, installs any missing dependencies, resolves directory paths, and opens the interactive menu.
3. **Press `1` and Enter**:
   - Launches the **Desktop Web Admin Console** at **`http://localhost:3000`**.
   - On desktop browsers, the app automatically renders as a full-screen **Web Admin Dashboard** with a fixed left sidebar, 4-column KPI overview, and multi-column operations workspace (while automatically adapting to mobile bottom-tab navigation on phones!).

*(If you are on macOS / Linux, open Terminal in this folder and run `bash run-demo.sh`)*

---

## 🧭 Defense Demonstration Menu Overview

When you run `run-demo.bat`, you will see:

| Option | What It Does | When to Use During Defense |
|---|---|---|
| **`[1]` Production Web Dashboard** | Starts fast local web server on `http://localhost:3000` | **Primary defense presentation tool**. Full-screen Desktop Web Admin Console with sidebar & KPI grid. |
| **`[2]` Expo Dev Server** | Starts Expo Metro on `http://localhost:8081` | Use if a panelist asks to see the app on a physical Android phone via QR code. |
| **`[3]` Lamion AI CLI Debugger** | Interactive terminal chat & guardrail tester | **Technical debugging inquiry**. Demonstrates culinary reasoning and prompt injection refusal live. |
| **`[4]` Re-populate Demo Data** | Seeds fresh orders (#1041-#1045), GCash slips, chat | Run this before your defense or between demo runs to reset all data to a clean state. |
| **`[5]` Run Automated Tests** | Executes all 117 Jest unit tests | Proves 100% test coverage and software reliability to technical panelists. |
| **`[6]` TypeScript Check** | Runs `npx tsc --noEmit` | Demonstrates 0 compile-time errors and strict type safety. |

---

## 🔑 Demo Accounts Cheat-Sheet

Log in with any of the accounts below (or use the sidebar **Quick View** links once signed in as Admin to jump directly between Customer Storefront and Staff / Rider views):

| Role | Email | Password | Access |
|---|---|---|---|
| **👑 Admin (Owner)** | `admin@foodfix.com` | `admin12345` | Revenue, 1-click order workflow, GCash approvals, refunds, stock |
| **🛵 Staff (Rider)** | `staff@foodfix.com` | `staff12345` | Kitchen preparation queue, delivery dispatch, order status |
| **🛍️ Customer** | `customer@foodfix.com` | `password123` | Browsing, ordering, live delivery tracking, Lamion AI chat |

---

## 🌟 Key Features to Highlight to the Panel

1. **Responsive React.js Web Dashboard (Same UI & Features as the Mobile App)**:
   - Built with React.js + Vite in `web/` matching FoodFix's warm cream `#F9F0DC`, orange `#F25C05`, and espresso `#2E1A06` UI design.
   - Includes Admin Web Console (Dashboard, Orders, Menu & Stock, Support Messages, Banners, Reviews, Lamion AI & Nutrition, Users & Store Settings), Staff/Rider Queue, and Customer Storefront (Home, Menu, Cart & Checkout, My Orders, Lamion AI Chat, Dish Scanner, Support Chat, Profile).
2. **Real-Time Financial & Order Metrics**:
   - Total sales today, gross revenue, pending orders, and in-flight order tracker.
3. **1-Click Order Lifecycle Management**:
   - On the Active Orders card, tap `[Accept]`, `[Cook]`, `[Dispatch]`, and `[Deliver]` to demonstrate the full business workflow live without leaving the screen.
4. **Lamion AI Subsystem Telemetry**:
   - Tap the `[AI Inspector]` button on the header to demonstrate:
     - Real-time inference through **NVIDIA NIM (70B model)** with ~800ms latency.
     - **Prompt-Injection & Non-Food Guardrails**: Show how malicious or non-food prompts (e.g. *"write code to hack wifi"*) are blocked by the culinary classifier.
     - **Authentic Filipino Culinary Knowledge**: Deep knowledge of 48+ regional dishes, ingredients, and nutrition.
5. **Real-time GCash Payment Verification & Refund Approvals**:
   - One-tap `[Verify Paid]` for GCash slips and 1-click refund approval/rejection.

