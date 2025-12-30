"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface McqQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  userAnswer?: string;
}

type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

export default function QuizReviewPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();

  const subjectId = Number(params.subjectId);
  const levelId = Number(params.level);
  const attemptId = Number(params.attemptId);

  const [questions, setQuestions] = useState<McqQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // ---------------- AUTH GUARD ----------------
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // ---------------- FETCH QUESTIONS WITH USER ANSWERS ----------------
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    fetch(
      `http://localhost:8080/api/mcqQuestionAttempts/level/${levelId}/attempt/${attemptId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data: McqQuestion[]) => {
        setQuestions(data);
        const ua: Record<number, string> = {};
        data.forEach((q: any) => {
          ua[q.id] = q.userAnswer || "";
        });
        setUserAnswers(ua);
      });
  }, [levelId, status, session, attemptId]);

  const currentQuestion = questions[currentIndex];

  // Check if all answers are correct
  const allCorrect = questions.every(
    (q) => userAnswers[q.id] === q.correctAnswer
  );

  // ---------------- AI CHAT ----------------
  const sendChat = async () => {
    if (!chatInput.trim()) return;

    setIsThinking(true);
    const inputCopy = chatInput;
    setChatInput("");

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: inputCopy },
      { role: "ai", content: "Thinking..." },
    ]);

    try {
      const res = await fetch("http://localhost:8080/api/questionAnswerChat", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          mcqUserQuestion: inputCopy,
          mcqQuestionId: currentQuestion.id,
          mcqLevelId: levelId,
          userAnswer: userAnswers[currentQuestion.id],
        }),
      });
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: data.reply || data.error },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: "Error: failed to get response" },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const resetChat = async () => {
    try {
      await fetch("http://localhost:8080/api/questionAnswerChat/reset", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ mcqLevelId: levelId }),
      });
      setChatMessages([]);
    } catch (err) {
      console.error("Failed to reset chat", err);
    }
  };

  const formatMessage = (text: string) => {
    let html = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
    html = html.replace(/^- (.+)$/gm, "• $1");
    html = html.replace(/\n/g, "<br />");
    return html;
  };

  // ---------------- COMPLETE LEVEL IF ALL CORRECT ----------------
  useEffect(() => {
    if (allCorrect && questions.length > 0) {
      fetch("http://localhost:8080/api/levelCompletion/complete-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ levelId }),
      });
    }
  }, [allCorrect, levelId, session, questions.length]);

  // ---------------- NAVIGATION HANDLERS ----------------
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading review...
      </div>
    );
  }

  return (
    <div className="flex h-screen gap-4 p-4 bg-gray-900 text-white">
      {/* ---------------- PROGRESS (LEFT COLUMN) ---------------- */}
      <div className="w-1/6 flex flex-col gap-4">
        {/* EXIT BUTTON MOVED HERE */}
        <button
          onClick={() => router.push(`/lessons/${subjectId}/${levelId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition px-2 py-2 rounded hover:bg-gray-800"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          <span className="font-semibold">Exit Review</span>
        </button>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex-1 overflow-y-auto">
          <h3 className="font-bold mb-3">Progress</h3>
          <div className="grid grid-cols-3 gap-2">
            {questions.map((q, idx) => {
              const isCorrect = userAnswers[q.id] === q.correctAnswer;
              const isCurrent = idx === currentIndex;
              const bg = isCorrect ? "bg-green-600" : "bg-red-600";

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-10 h-10 rounded text-sm font-semibold text-white ${bg} ${
                    isCurrent ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800" : ""
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- QUESTION REVIEW (MIDDLE COLUMN) ---------------- */}
      <div className="w-2/3 bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">
            Question {currentIndex + 1}
          </h2>

          <p className="mb-6 text-gray-200 text-lg">{currentQuestion.question}</p>

          {(["A", "B", "C", "D"] as const).map((opt) => {
            const value = currentQuestion[`option${opt}` as keyof McqQuestion];
            const userChoice = userAnswers[currentQuestion.id];
            const correctChoice = currentQuestion.correctAnswer;

            let bg = "bg-gray-700 border-transparent";
            let icon = null;

            if (opt === correctChoice) {
              bg = "bg-green-900/40 border-green-600"; // Correct answer style
              icon = <span className="text-green-500 font-bold">✓</span>;
            } else if (opt === userChoice && userChoice !== correctChoice) {
              bg = "bg-red-900/40 border-red-600"; // Wrong selected answer style
              icon = <span className="text-red-500 font-bold">✗</span>;
            }

            return (
              <div
                key={opt}
                className={`flex items-center gap-3 mb-3 p-4 rounded border ${bg} text-white transition-all`}
              >
                <span className="font-bold min-w-[20px]">{opt}.</span>
                <span className="flex-1">{value}</span>
                {icon}
              </div>
            );
          })}
        </div>

        {/* NAVIGATION BUTTONS */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-6 py-2 rounded font-semibold transition ${
              currentIndex === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className={`px-6 py-2 rounded font-semibold transition ${
              currentIndex === questions.length - 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ---------------- AI CHAT (RIGHT COLUMN) ---------------- */}
      <div className="w-1/3 flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">AI Help</h3>
          <button
            onClick={resetChat}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
          >
            Clear Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-700 rounded p-4 bg-gray-800">
          {chatMessages.length === 0 && (
            <p className="text-gray-400 text-center text-sm mt-10">
              Ask AI why an answer is correct or incorrect.
            </p>
          )}
          {chatMessages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 p-3 rounded-lg max-w-[90%] text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white self-end ml-auto rounded-br-none"
                  : "bg-gray-700 text-gray-100 self-start mr-auto rounded-bl-none"
              }`}
            >
              <span
                dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }}
              />
            </div>
          ))}
          
        </div>

        <div className="flex gap-2 mt-3">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about this question..."
            rows={1}
            className="flex-1 resize-none border border-gray-600 rounded px-3 py-2 bg-gray-900 text-white focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
          />
          <button
            onClick={sendChat}
            disabled={isThinking || !chatInput.trim()}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}