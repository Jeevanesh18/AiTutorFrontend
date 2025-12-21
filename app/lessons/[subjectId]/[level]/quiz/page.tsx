/*"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

type ChatMessage = {
  role: "user" | "ai";
  content: string;
};

export default function QuizPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();

  const subjectId = Number(params.subjectId);
  const levelId = Number(params.level);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // ---------------- AUTH GUARD ----------------
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // ---------------- FETCH QUESTIONS ----------------
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    fetch(`http://localhost:8080/api/mcq-questions/level/${levelId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then(setQuestions);
  }, [levelId, status, session]);

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading questions...
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const allAnswered = Object.keys(answers).length === questions.length;

  // ---------------- CHAT ----------------
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
      const res = await fetch("http://localhost:8080/api/questionChat", {
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
        }),
      });
      const data = await res.json();

      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: data.reply },
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

  // ---------------- RESET CHAT ----------------
  const resetChat = async () => {
    try {
      await fetch("http://localhost:8080/api/questionChat/reset", {
        method: "POST", 
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
        mcqLevelId:levelId,
      }),
      });
      setChatMessages([]);
    } catch (err) {
      console.error("Failed to reset chat", err);
    }
  };

  const submitAnswers = async () => {
  try {
    const res = await fetch(
      `http://localhost:8080/api/mcqQuestionAttempts/save/${levelId}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          userAnswers: answers,
          userId: session?.user.id,
        }),
      }
    );

    // convert response body to JS value
    const data = await res.json(); // <-- this is the Long (attemptId)

    if(data.allCorrect){
      alert("Congratulations! All your answers are correct. You have passed the quiz.");
    }
    console.log("Attempt ID:", data.attemptId);
    return data.attemptId;

  } catch (err) {
    console.error("Failed to submit answers", err);
  }
};
*/
/*

  
  //format()


  return (
    <div className="flex h-screen gap-4 p-4 bg-gray-900 text-white">
      <div className="w-1/6 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="font-bold mb-3">Progress</h3>
        <div className="grid grid-cols-3 gap-2">
          {questions.map((q, idx) => {
            const answered = answers[q.id];
            const flagged = flags[q.id];
            const isCurrent = idx === currentIndex;

            let bg = "bg-gray-600";
            if (flagged) bg = "bg-red-600";
            else if (answered) bg = "bg-green-600";

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded text-sm font-semibold text-white ${bg} ${
                  isCurrent ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="w-2/3 bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4">
          Question {currentIndex + 1}
        </h2>

        <p className="mb-6 text-gray-200">{currentQuestion.question}</p>

        <div className="flex-1 overflow-y-auto">
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const value = currentQuestion[`option${opt}` as keyof Question];
            return (
              <label
                key={opt}
                className="flex items-center gap-3 mb-3 cursor-pointer bg-gray-700 p-3 rounded hover:bg-gray-600 transition"
              >
                <input
                  type="radio"
                  name="answer"
                  value={opt}
                  checked={answers[currentQuestion.id] === opt}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: opt,
                    }))
                  }
                />
                <span>{value}</span>
              </label>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="px-4 py-2 bg-blue-600 rounded disabled:bg-gray-600 hover:bg-blue-700 transition"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setFlags((prev) => ({
                ...prev,
                [currentQuestion.id]: !prev[currentQuestion.id],
              }))
            }
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
          >
            {flags[currentQuestion.id] ? "Unflag" : "Flag"}
          </button>

          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-4 py-2 bg-blue-600 rounded disabled:bg-gray-600 hover:bg-blue-700 transition"
          >
            Next
          </button>
        </div>

        <button
          disabled={!allAnswered}
          onClick={async () => {
     const id = await submitAnswers(); // get attemptId directly
  if (id) {
    router.push(`/lessons/${subjectId}/${levelId}/quiz/${id}`);
  }
  }}
          className={`mt-6 px-6 py-2 rounded text-white transition ${
            allAnswered
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          Submit
        </button>
      </div>
      <div className="w-1/3 flex flex-col h-full">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">AI Help</h3>
          <button
            onClick={resetChat}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-700 rounded p-4 bg-gray-800">
          {chatMessages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 p-2 rounded max-w-[90%] ${
                m.role === "user"
                  ? "bg-blue-700 text-white self-end ml-auto"
                  : "bg-gray-700 text-white self-start mr-auto"
              }`}
            >
              { <span dangerouslySetInnerHTML={{ __html: formatMessage(m.content) }} /> }
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about this question..."
            rows={2}
            className="flex-1 resize-none border border-gray-600 rounded px-2 py-1 bg-gray-900 text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
          />
          <button
            onClick={sendChat}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
*/

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export default function QuizPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();

  const subjectId = Number(params.subjectId);
  const levelId = Number(params.level);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});

  // ---------------- AUTH GUARD ----------------
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // ---------------- FETCH QUESTIONS ----------------
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) return;

    fetch(`http://localhost:8080/api/mcq-questions/level/${levelId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })
      .then((res) => res.json())
      .then(setQuestions);
  }, [levelId, status, session]);

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading questions...
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const allAnswered = Object.keys(answers).length === questions.length;

  const submitAnswers = async () => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/mcqQuestionAttempts/save/${levelId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            userAnswers: answers,
            userId: session?.user.id,
          }),
        }
      );

      const data = await res.json(); // attemptId + allCorrect
      if (data.allCorrect) {
        alert(
          "Congratulations! All your answers are correct. You have passed the quiz."
        );
      }
      console.log("Attempt ID:", data.attemptId);
      return data.attemptId;
    } catch (err) {
      console.error("Failed to submit answers", err);
    }
  };

  return (
    <div className="flex h-screen gap-4 p-4 bg-gray-900 text-white">
      {/* ---------------- PROGRESS ---------------- */}
      <div className="w-1/6 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="font-bold mb-3">Progress</h3>
        <div className="grid grid-cols-3 gap-2">
          {questions.map((q, idx) => {
            const answered = answers[q.id];
            const flagged = flags[q.id];
            const isCurrent = idx === currentIndex;

            let bg = "bg-gray-600";
            if (flagged) bg = "bg-red-600";
            else if (answered) bg = "bg-green-600";

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded text-sm font-semibold text-white ${bg} ${
                  isCurrent ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- QUESTION ---------------- */}
      <div className="flex-1 bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
        <h2 className="text-xl font-bold mb-4">
          Question {currentIndex + 1}
        </h2>
        <p className="mb-6 text-gray-200">{currentQuestion.question}</p>

        <div className="flex-1 overflow-y-auto">
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const value = currentQuestion[`option${opt}` as keyof Question];
            return (
              <label
                key={opt}
                className="flex items-center gap-3 mb-3 cursor-pointer bg-gray-700 p-3 rounded hover:bg-gray-600 transition"
              >
                <input
                  type="radio"
                  name="answer"
                  value={opt}
                  checked={answers[currentQuestion.id] === opt}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: opt,
                    }))
                  }
                />
                <span>{value}</span>
              </label>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="px-4 py-2 bg-blue-600 rounded disabled:bg-gray-600 hover:bg-blue-700 transition"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setFlags((prev) => ({
                ...prev,
                [currentQuestion.id]: !prev[currentQuestion.id],
              }))
            }
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
          >
            {flags[currentQuestion.id] ? "Unflag" : "Flag"}
          </button>

          <button
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-4 py-2 bg-blue-600 rounded disabled:bg-gray-600 hover:bg-blue-700 transition"
          >
            Next
          </button>
        </div>

        {/* Submit */}
        <button
          disabled={!allAnswered}
          onClick={async () => {
            const id = await submitAnswers();
            if (id) {
              router.push(`/lessons/${subjectId}/${levelId}/quiz/${id}`);
            }
          }}
          className={`mt-6 px-6 py-2 rounded text-white transition ${
            allAnswered
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
