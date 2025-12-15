"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Extend NextAuth session type to include the Backend JWT
 */
declare module "next-auth" {
  interface Session {
    accessToken?: string; // 👈 This corresponds to the Java JWT we added in authOptions
    user: {
      id: string; // backend user ID
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

type Subject = {
  subjectId: number;
  subjectName: string;
};

export default function LessonsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const getSubjects = async () => {
    try {
      // Wait until session is ready and ensures accessToken exists
      if (status !== "authenticated" || !session?.accessToken) return;

      console.log("Session status:", status);
      console.log("Using Access Token:", session.accessToken);

      const res = await fetch("http://localhost:8080/api/subjects", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 🔑 Send the Backend-Minted JWT (String)
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!res.ok) {
        console.error("Backend returned error:", res.status, await res.text());
        // Optional: specific handling for 401 (expired token)
        if (res.status === 401) {
            // Force sign out if token is invalid
            // signOut(); 
        }
        return;
      }

      const data: Subject[] = await res.json();
      setSubjects(data);
    } catch (e) {
      console.error("Fetching subjects failed:", e);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      getSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]); // Re-run when session is fully loaded

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-xl">Loading session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    // Optional: Redirect if not logged in
    router.push("/"); 
    return null;
  }

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
          {subjects.length === 0 ? (
            <p className="text-white text-center">No subjects found or loading...</p>
          ) : (
            subjects.map((subject) => (
              <button
                key={subject.subjectId}
                onClick={() => router.push(`/lessons/${subject.subjectId}`)}
                className="bg-white/90 hover:bg-white text-black font-semibold py-4 px-6 rounded-xl shadow-lg hover:scale-[1.03] transition transform"
              >
                {subject.subjectName}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}