"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subject = {
  subjectId: number;
  subjectName: string;
};

export default function LessonsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const getSubjects = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/subjects", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        console.error("Backend returned error:", await res.text());
        return;
      }

      const data: Subject[] = await res.json();
      setSubjects(data);
    } catch (e) {
      console.error("Fetching subjects failed:", e);
    }
  };

  useEffect(() => {
    getSubjects();
  }, []);

 return (
  <div className="relative min-h-screen flex flex-col">

    {/* Background */}
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/1.jpg')" }}
    ></div>

    {/* Overlay */}
    <div className="absolute inset-0 bg-black/60"></div>

    {/* Content */}
    <div className="relative z-10 flex-1 p-8 flex flex-col items-center">
      <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">
        Choose a Subject 🎓
      </h1>

      <div className="grid gap-6 w-full max-w-xl">
        {subjects.map((subject) => (
          <button
            key={subject.subjectId}
            onClick={() => router.push(`/lessons/${subject.subjectId}`)}
            className="bg-white/90 hover:bg-white text-black font-semibold py-4 px-6 rounded-xl shadow-lg hover:scale-[1.03] transition transform"
          >
            {subject.subjectName}
          </button>
        ))}
      </div>
    </div>
  </div>
);

}
