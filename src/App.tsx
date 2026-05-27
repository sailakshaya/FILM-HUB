import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { User } from "firebase/auth";
import {
  db,
  auth,
  initAuth,
  googleSignIn,
  logout,
  handleFirestoreError,
  OperationType,
} from "./firebase";
import { Profile, Project, Schedule } from "./types";

// Subcomponents
import MyProfileDashboard from "./components/MyProfileDashboard";
import CrewDatabase from "./components/CrewDatabase";
import Messenger from "./components/Messenger"; // Replaces Budget Matching as requested
import AiRecommender from "./components/AiRecommender";
import CalendarSystem from "./components/CalendarSystem";

// Icons
import {
  Film,
  Users2,
  MessageSquare,
  Calendar,
  Sparkles,
  LogOut,
  User as UserIcon,
  ArrowLeft,
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Firestore DB states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"roster" | "lounge" | "ai" | "calendar">("roster");
  const [editingSelfProfile, setEditingSelfProfile] = useState(false);

  // Get current user's profile
  const selfProfile = currentUser
    ? profiles.find((p) => p.userId === currentUser.uid) ||
      (() => {
        const cached = localStorage.getItem(`filmhub_self_profile_${currentUser.uid}`);
        return cached ? JSON.parse(cached) : null;
      })()
    : null;

  // 1. Listen for Authentication status on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGoogleAccessToken(token);
        setAuthChecked(true);
      },
      () => {
        setCurrentUser(null);
        setGoogleAccessToken(token => token);
        setAuthChecked(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync session auth variables
  const updateGoogleToken = async () => {
    try {
      const token = await googleSignIn();
      if (token) {
        setGoogleAccessToken(token.accessToken);
        setCurrentUser(token.user);
      }
    } catch (err: any) {
      console.error("Token sync failed", err);
    }
  };

  // 2. Real-time Firestore synchronized listeners
  useEffect(() => {
    if (!currentUser) {
      setProfiles([]);
      setProfilesLoaded(false);
      setProjects([]);
      setSchedules([]);
      return;
    }

    // Subscribe to Profiles collection
    const unsubsProfiles = onSnapshot(
      collection(db, "profiles"),
      (snap) => {
        const list: Profile[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as Profile);
        });
        setProfiles(list);
        setProfilesLoaded(true);

        const myProf = list.find((p) => p.userId === currentUser.uid);
        if (myProf) {
          localStorage.setItem(`filmhub_self_profile_${currentUser.uid}`, JSON.stringify(myProf));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "profiles");
        setProfilesLoaded(true);
      }
    );

    // Subscribe to Projects collection
    const unsubsProjects = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        const list: Project[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as Project);
        });
        setProjects(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "projects");
      }
    );

    // Subscribe to Schedules collection
    const unsubsSchedules = onSnapshot(
      collection(db, "schedules"),
      (snap) => {
        const list: Schedule[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as Schedule);
        });
        setSchedules(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, "schedules");
      }
    );

    return () => {
      unsubsProfiles();
      unsubsProjects();
      unsubsSchedules();
    };
  }, [currentUser]);

  // Google sign in helper
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setGoogleAccessToken(res.accessToken);
      }
    } catch (error: any) {
      setAuthError(
        "Registration or Sign-In failed via Google Pop-up. Try again. Message: " +
          (error.message || String(error))
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  // Logout helper
  const handleLogout = async () => {
    try {
      if (currentUser) {
        localStorage.removeItem(`filmhub_self_profile_${currentUser.uid}`);
      }
      await logout();
      setCurrentUser(null);
      setGoogleAccessToken(null);
      setActiveTab("roster");
      setEditingSelfProfile(false);
    } catch (err: any) {
      console.error("Logout error: ", err);
    }
  };

  // Database controllers
  const handleSaveProfile = async (profileData: Partial<Profile>) => {
    if (!currentUser) return;
    const path = `profiles/${currentUser.uid}`;
    try {
      const docRef = doc(db, "profiles", currentUser.uid);
      const fullProfile: Profile = {
        userId: currentUser.uid,
        name: profileData.name || currentUser.displayName || "Anonymous Crew",
        role: profileData.role || "Cinematographer",
        experience: Number(profileData.experience) || 0,
        budgetExpectation: Number(profileData.budgetExpectation) || 0,
        availability: profileData.availability || "Available",
        bio: profileData.bio || "",
        languages: profileData.languages || ["English"],
        ratings: selfProfile?.ratings || 4.8,
        previousProjects: profileData.previousProjects || [],
        email: currentUser.email || "",
        phone: profileData.phone || "",
        socialLinks: profileData.socialLinks || [],
        city: profileData.city || selfProfile?.city || "",
        state: profileData.state || selfProfile?.state || "",
        avatarUrl: profileData.avatarUrl ?? selfProfile?.avatarUrl ?? currentUser.photoURL ?? "",
        createdAt: selfProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, fullProfile);

      // Keep state and localStorage thoroughly synced in real-time
      localStorage.setItem(`filmhub_self_profile_${currentUser.uid}`, JSON.stringify(fullProfile));

      // Update state optimistically so other tabs are immediately aware of the profile!
      setProfiles((prev) => {
        const existingIdx = prev.findIndex((p) => p.userId === currentUser.uid);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = fullProfile;
          return updated;
        } else {
          return [...prev, fullProfile];
        }
      });

      // Stay on dashboard to let the user view their updated profile and choose when to go back manually!
    } catch (err) {
      handleFirestoreError(err, selfProfile ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleSaveProject = async (projData: Partial<Project>) => {
    if (!currentUser || !projData.projectId) return;
    const path = `projects/${projData.projectId}`;
    const exists = projects.some((p) => p.projectId === projData.projectId);
    try {
      const docRef = doc(db, "projects", projData.projectId);
      const fullProject: Project = {
        projectId: projData.projectId,
        title: projData.title || "Untitled Film",
        description: projData.description || "",
        producerId: projData.producerId || currentUser.uid,
        producerName: projData.producerName || selfProfile?.name || "Anonymous Producer",
        status: projData.status || "Pre-Production",
        totalBudget: Number(projData.totalBudget) || 0,
        departmentBudgets: projData.departmentBudgets || {},
        expenses: projData.expenses || [],
        crewMembers: projData.crewMembers || [],
        createdAt: projData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, fullProject);
    } catch (err) {
      handleFirestoreError(err, exists ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const path = `projects/${projectId}`;
    try {
      await deleteDoc(doc(db, "projects", projectId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const handleSaveSchedule = async (schedData: Partial<Schedule>) => {
    if (!currentUser || !schedData.scheduleId) return;
    const path = `schedules/${schedData.scheduleId}`;
    const exists = schedules.some((s) => s.scheduleId === schedData.scheduleId);
    try {
      const docRef = doc(db, "schedules", schedData.scheduleId);
      const fullSchedule: Schedule = {
        scheduleId: schedData.scheduleId,
        projectId: schedData.projectId || "",
        projectTitle: schedData.projectTitle || "",
        date: schedData.date || "",
        location: schedData.location || "",
        callTime: schedData.callTime || "",
        callSheetUrl: schedData.callSheetUrl || "",
        productionNotes: schedData.productionNotes || "",
        crewList: schedData.crewList || [],
        googleEventId: schedData.googleEventId || "",
        createdAt: schedData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, fullSchedule);
    } catch (err) {
      handleFirestoreError(err, exists ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const path = `schedules/${scheduleId}`;
    try {
      await deleteDoc(doc(db, "schedules", scheduleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // AI Matches: adds candidate to core project list directly
  const handleAddCrewToProject = async (projectId: string, candidate: Profile) => {
    const targetProj = projects.find((p) => p.projectId === projectId);
    if (!targetProj) return;

    // Reject duplicate matching to fit criteria
    if (targetProj.crewMembers.some((m) => m.userId === candidate.userId)) {
      throw new Error("This filmmaker holds an active status in this project files.");
    }

    const newMember = {
      userId: candidate.userId,
      name: candidate.name,
      role: candidate.role,
      email: candidate.email,
      status: "invited" as const,
      rate: candidate.budgetExpectation,
    };

    const updatedCrew = [...(targetProj.crewMembers || []), newMember];

    await handleSaveProject({
      ...targetProj,
      crewMembers: updatedCrew,
    });
  };

  // Render Loader Gate
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAF5EF] flex flex-col justify-center items-center text-center p-8 font-sans transition-all duration-500">
        <Film className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
        <h2 className="text-[#3E2723] font-display text-sm uppercase tracking-[0.3em] font-black">
          FILM HUB INITIATING
        </h2>
        <p className="text-[#3E2723]/50 text-xs font-mono mt-2 uppercase tracking-widest">
          Syncing secure firebase nodes...
        </p>
      </div>
    );
  }

  // Gateway Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF5EF] flex items-center justify-center p-4 sm:p-8 font-sans selection:bg-[#3E2723] selection:text-white">
        <div className="max-w-2xl w-full text-center space-y-8 animate-fadeIn">
          {/* Logo container heading */}
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5EFEB] border-2 border-[#D4AF37] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300">
                <Film className="w-8 h-8 text-[#3E2723] drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-display text-[#3E2723] tracking-[0.25em] uppercase">
              FILM HUB
            </h1>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-extrabold">
              Intelligent Crew Selection & Chat System
            </p>
          </div>

          <div className="bg-[#F5EFEB] border border-[#3E2723]/15 p-8 sm:p-12 rounded-3xl space-y-6 shadow-xl max-w-lg mx-auto hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-shadow">
            {authError && (
              <div className="bg-[#0A192F] text-stone-200 border border-[#D4AF37]/50 p-4 text-left rounded-xl shadow-md space-y-1">
                <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider font-mono">Authentication Alert:</p>
                <p className="text-xs text-[#FDFBF7]/90 leading-relaxed font-mono">{authError}</p>
              </div>
            )}

            {/* Google workspace SSO login button */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full sm:w-auto px-6 py-3 cursor-pointer select-none rounded-xl border border-[#3E2723]/25 bg-[#0A192F] text-[#FDFBF7] font-sans hover:shadow-[0_0_15px_rgba(212,175,55,0.45)] transition duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <div className="bg-[#FAF5EF] p-1 rounded-full shrink-0 flex items-center justify-center">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.41-4.69H24v9.09h12.64c-.54 2.87-2.16 5.31-4.6 6.95v5.77h7.45c4.36-4.01 6.88-9.92 6.88-17.12z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.45-5.77c-2.06 1.38-4.7 2.2-8.44 2.2-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span className="text-white font-black text-xs tracking-wider uppercase">
                  {isSigningIn ? "AUTHORIZING PROMPT..." : "Sign in with Google Workspace"}
                </span>
              </button>
            </div>
          </div>

          <footer className="text-[10px] uppercase tracking-widest text-[#3E2723]/50 font-mono font-bold">
            FILM HUB LOGISTICS • PRODUCTION SYSTEM COOPERATIVE
          </footer>
        </div>
      </div>
    );
  }

  // Active Signed-In Portal Layout
  return (
    <div className="min-h-screen bg-[#FAF5EF] text-[#3E2723] flex flex-col font-sans selection:bg-[#3E2723] selection:text-white pb-12">
      
      {/* Visual Masthead Header */}
      <header className="border-b border-[#3E2723]/10 bg-[#0A192F] text-[#FDFBF7] sticky top-0 z-40 shadow-lg px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Film className="w-5 h-5 text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.73)]" />
          <div>
            <h1 className="text-sm font-black tracking-[0.25em] font-display uppercase text-white">
              FILM HUB
            </h1>
            <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-black mt-0.5">
              Intelligent Production Network
            </p>
          </div>
        </div>

        {/* User context profile skips and logs */}
        <div className="flex items-center gap-4 text-xs font-sans self-end sm:self-center">
          
          {/* Clicking this Skip-to-Profile icon moves straight to the profile edit form panel */}
          <button
            onClick={() => {
              setEditingSelfProfile(true);
            }}
            className="flex items-center gap-2.5 text-left border border-[#D4AF37]/35 bg-[#3E2723]/20 hover:border-[#D4AF37] px-3.5 py-1.5 rounded-xl transition cursor-pointer"
            title="Edit My Profile Details"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#D4AF37]/40 flex items-center justify-center bg-[#3E2723]/20 shrink-0">
              {selfProfile?.avatarUrl ? (
                <img
                  src={selfProfile.avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[10px] font-black text-[#D4AF37] uppercase font-mono tracking-tighter">
                  {selfProfile?.name ? selfProfile.name.slice(0, 2) : "CF"}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[#FDFBF7] font-black hover:text-[#D4AF37] text-[11px] block transition">
                {selfProfile?.name || currentUser.displayName || "Register Profile"}
              </span>
              <span className="text-[#D4AF37] font-mono text-[9px] block uppercase font-bold">
                {selfProfile ? selfProfile.role : "Setup Profile"}
              </span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="text-[#FDFBF7]/70 hover:text-red-400 transition cursor-pointer p-2 rounded-xl hover:bg-white/5"
            title="Sign Out of Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Persistent Navigation & Tabs Selection - Visible at ALL Times */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1 flex flex-col gap-6">
        
        {/* Navigation Panel */}
        <div className="flex border-b border-[#3E2723]/15 text-xs sm:text-xs uppercase tracking-wider font-extrabold font-display gap-1 overflow-x-auto min-h-[45px] pb-1.5 pt-0.5">
          <button
            onClick={() => {
              setActiveTab("roster");
              setEditingSelfProfile(false);
            }}
            className={`pb-2.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "roster" && !editingSelfProfile
                ? "border-[#D4AF37] text-[#3E2723] font-black shadow-[0_4px_10px_-4px_rgba(212,175,55,0.5)]"
                : "border-transparent text-[#3E2723]/60 hover:text-[#3E2723]"
            }`}
          >
            <Users2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            Filmmaker Roster
          </button>

          <button
            onClick={() => {
              setActiveTab("lounge");
              setEditingSelfProfile(false);
            }}
            className={`pb-2.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "lounge" && !editingSelfProfile
                ? "border-[#D4AF37] text-[#3E2723] font-black shadow-[0_4px_10px_-4px_rgba(212,175,55,0.5)]"
                : "border-transparent text-[#3E2723]/60 hover:text-[#3E2723]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#D4AF37]" />
            Lounge Chat
          </button>

          <button
            onClick={() => {
              setActiveTab("ai");
              setEditingSelfProfile(false);
            }}
            className={`pb-2.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "ai" && !editingSelfProfile
                ? "border-[#D4AF37] text-[#3E2723] font-black shadow-[0_4px_10px_-4px_rgba(212,175,55,0.5)]"
                : "border-transparent text-[#3E2723]/60 hover:text-[#3E2723]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            AI Matchmaker
          </button>

          <button
            onClick={() => {
              setActiveTab("calendar");
              setEditingSelfProfile(false);
            }}
            className={`pb-2.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 ${
              activeTab === "calendar" && !editingSelfProfile
                ? "border-[#D4AF37] text-[#3E2723] font-black shadow-[0_4px_10px_-4px_rgba(212,175,55,0.5)]"
                : "border-transparent text-[#3E2723]/60 hover:text-[#3E2723]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
            Shoot Schedule
          </button>

          {/* Persistent Skip-to-Panel Quick Tab */}
          <button
            onClick={() => setEditingSelfProfile(true)}
            className={`pb-2.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer shrink-0 uppercase ml-auto font-black font-mono text-[11px] ${
              editingSelfProfile
                ? "border-[#D4AF37] text-[#3E2723] font-extrabold shadow-[0_4px_10px_-4px_rgba(212,175,55,0.5)]"
                : "border-transparent text-[#3E2723]/60 hover:text-[#D4AF37]"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
            My Profile File
          </button>
        </div>

        {/* Global Back Button Element in top left of EVERY sub page/tab */}
        {(activeTab !== "roster" || editingSelfProfile) && (
          <div className="flex animate-fadeIn">
            <button
              onClick={() => {
                setActiveTab("roster");
                setEditingSelfProfile(false);
              }}
              className="flex items-center gap-2 text-xs font-mono font-black text-[#3E2723] hover:text-[#0A192F] transition uppercase px-4 py-2 bg-[#F5EFEB] border border-[#3E2723]/15 rounded-xl hover:shadow-[0_0_10px_rgba(212,175,55,0.2)] select-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
              ← Return back to Home
            </button>
          </div>
        )}

        {/* Profile Warning banner */}
        {!selfProfile && profilesLoaded && !editingSelfProfile && (
          <div className="bg-[#F5EFEB] border border-[#3E2723]/20 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
            <div>
              <h4 className="text-[#3E2723] font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                Initialize Profile Record
              </h4>
              <p className="text-xs text-[#3E2723]/80 font-medium">
                Set up your professional portfolio details (daily rate, location, contact, film titles) to chat and sync AI recommendations!
              </p>
            </div>
            <button
              onClick={() => setEditingSelfProfile(true)}
              className="px-5 py-2.5 bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] text-[11px] font-black uppercase tracking-wider rounded-xl transition shrink-0 cursor-pointer shadow-sm"
            >
              Set Up Profile
            </button>
          </div>
        )}

        {/* Component router viewport */}
        <div className="flex-1">
          {!profilesLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#3E2723] animate-pulse">
              <div className="w-8 h-8 rounded-full border-4 border-[#3E2723]/10 border-t-[#D4AF37] animate-spin mb-4" />
              <p className="text-xs font-mono font-black uppercase tracking-widest text-[#3E2723]/60">Scanning Global Cinematic Registries...</p>
            </div>
          ) : editingSelfProfile ? (
            <MyProfileDashboard
              key={currentUser?.uid + (selfProfile ? "-loaded" : "-none")}
              initialProfile={selfProfile}
              currentUserEmail={currentUser?.email || ""}
              currentUserId={currentUser?.uid || ""}
              onSave={handleSaveProfile}
              onCancel={() => {
                setEditingSelfProfile(false);
              }}
            />
          ) : (
            <>
              {activeTab === "roster" && (
                <CrewDatabase
                  profiles={profiles}
                  currentUserId={currentUser.uid}
                  selfProfile={selfProfile}
                  onEditSelfProfile={() => setEditingSelfProfile(true)}
                />
              )}

              {activeTab === "lounge" && (
                <Messenger
                  profiles={profiles}
                  currentUserId={currentUser.uid}
                  selfProfile={selfProfile}
                />
              )}

              {activeTab === "ai" && (
                <AiRecommender
                  projects={projects}
                  profiles={profiles}
                  currentUserId={currentUser.uid}
                  selfProfile={selfProfile}
                  onAddCrewToProject={handleAddCrewToProject}
                />
              )}

              {activeTab === "calendar" && (
                <CalendarSystem
                  schedules={schedules}
                  projects={projects}
                  profiles={profiles}
                  currentUserId={currentUser.uid}
                  userGoogleToken={googleAccessToken}
                  onSaveSchedule={handleSaveSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
