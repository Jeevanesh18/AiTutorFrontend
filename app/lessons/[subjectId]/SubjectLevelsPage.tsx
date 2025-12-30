"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Level {
  levelId: number;
  title: string;
  orderNum: string;
  subjectId: number;
}

interface UserProgress {
  id: number;
  userId: number;
  updatedAt: string;
  currentLevelId: number;
  subjectId: number;
}
export default function SubjectLevelsPage({ subjectId }: { subjectId: number }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = session?.user?.id;
  const creatingProgressRef = useRef(false);

  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
     if (status === "unauthenticated") {
    router.push("/");
  }
     if (!userId) return;

    const loadData = async () => {
      try {
        const levelsRes = await fetch(`http://localhost:8080/api/levels/subject/${subjectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
        const levelsData: Level[] = await levelsRes.json();
        setLevels(levelsData);
        console.log(userId);
        const progressRes = await fetch(`http://localhost:8080/api/user-progress/user/${userId}/subjectId/${subjectId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
        const existingProgress: UserProgress = await progressRes.json();

       // const existingProgress = progressData.find(p => p.subjectId === subjectId);
        if (existingProgress) {
          setCurrentLevel(existingProgress.currentLevelId);
        } else {

          if (creatingProgressRef.current) return; 
          creatingProgressRef.current = true; 
            const newProgress = await fetch("http://localhost:8080/api/user-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json",Authorization: `Bearer ${session.accessToken}` },
            body: JSON.stringify({ userId, subjectId, currentLevelId: 1 }),
          });
                     
          const created = await newProgress.json();
          console.log("Created new progress:", created);
          setCurrentLevel(created.currentLevelId);
        }
      } catch (err) {
        console.error("Failed to load levels:", err);
      }

      setLoading(false);
    };

    loadData();
  }, [userId, subjectId, status,router]);

  // Show temporary message for locked levels
  const handleLockedClick = () => {
    setMessage("You need to unlock previous levels by completing the practices!");
    setTimeout(() => setMessage(""), 3000); // hide after 3 seconds
  };

  if (loading) return <p className="p-8 text-white">Loading...</p>;

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
{/* Top-left Back Button */}
  <button
    onClick={() => router.push("/lessons")}
    className="absolute top-4 left-4 bg-white/80 hover:bg-white text-black font-semibold py-2 px-4 rounded-lg shadow-lg transition"
  >
    ← Lessons
  </button>

        <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">
          Levels🎮
        </h1>

        <div className="grid gap-6 w-full max-w-xl">
          {levels
            .sort((a, b) => Number(a.orderNum) - Number(b.orderNum))
            .map(level => {
              const unlocked = Number(level.orderNum) <= currentLevel;
              return (
                <button
                  key={level.levelId}
                  onClick={() =>
                    unlocked
                      ? router.push(`/lessons/${subjectId}/${level.levelId}`)
                      : handleLockedClick()
                  }
                  className={`bg-white/90 hover:bg-white text-black font-semibold py-4 px-6 rounded-xl shadow-lg hover:scale-[1.03] transition transform
                    ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  Level {level.orderNum}: {level.title}
                </button>
              );
            })}
        </div>

        {/* Temporary message */}
        {message && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg animate-fadeInOut">
            {message}
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-fadeInOut {
          animation: fadeInOut 3s ease forwards;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
