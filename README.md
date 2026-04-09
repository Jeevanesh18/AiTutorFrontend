# AI Tutor Frontend 🧠✨

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

Welcome to the frontend interface of the **AI Tutor** platform! This repository contains the user-facing web application that students and developers interact with to learn programming, submit code, and chat with the AI.

🌍 **Live Demo:**[nova-seven-teal.vercel.app](https://nova-seven-teal.vercel.app) *(Currently not running)*

---

## 📖 What is this project about?

The **AI Tutor** is an interactive, web-based learning platform. It moves beyond simple static tutorials by offering an intelligent companion that can analyze user code, highlight mistakes, and offer personalized, pedagogical feedback. 

This repository specifically houses the **Frontend User Interface (UI)**. It provides a sleek, responsive experience where users can:
* Write and edit code in an integrated browser-based editor.
* Submit code for evaluation.
* Chat seamlessly with the AI Tutor to receive hints, explanations, and guidance.

## ⚙️ How it Works & Architecture

The frontend is built using **Next.js (App Router)** and **TypeScript** to ensure a fast, SEO-friendly, and type-safe application. 

### Communication with the Backend
This frontend acts as the client-side presentation layer. When a user submits code or asks a question:
1. The frontend packages the payload and sends a REST API request to the **Spring Boot Main Backend**.
2. The Backend orchestrates the logic (running code in the Docker sandbox, fetching AI responses).
3. The response is sent back to the Next.js frontend, which dynamically updates the UI to show the code execution results or the AI's chat response.

## 🛠️ Tech Stack
* **Framework:** Next.js (React)
* **Language:** TypeScript
* **Styling:** CSS / Tailwind CSS (via PostCSS)
* **Deployment:** Vercel

## 📂 Project Structure
```text
AiTutorFrontend/
├── app/              # Next.js App Router (Pages, Layouts, API routes)
├── public/           # Static assets (images, icons, etc.)
├── types/            # Global TypeScript definitions and interfaces
├── next.config.ts    # Next.js configuration
├── postcss.config.mjs# PostCSS configuration (Tailwind)
├── tsconfig.json     # TypeScript configuration
└── package.json      # Project dependencies and scripts
