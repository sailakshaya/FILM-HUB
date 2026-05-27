import React, { useState } from "react";
import { Project, Profile, AIRecommendation } from "../types";
import { Sparkles, Brain, CheckSquare, ShieldCheck, HelpCircle, Film, User, Compass, MapPin } from "lucide-react";

interface AiRecommenderProps {
  projects: Project[];
  profiles: Profile[];
  currentUserId: string;
  selfProfile: Profile | null;
  onAddCrewToProject: (projectId: string, candidate: Profile) => Promise<void>;
}

interface ProjectRecommendation {
  projectId: string;
  title: string;
  matchScore: number;
  reasoning: string;
  rateCompatibility: string;
}

export default function AiRecommender({
  projects,
  profiles,
  currentUserId,
  selfProfile,
  onAddCrewToProject,
}: AiRecommenderProps) {
  // Check Mode
  const isProducerOrDirector = selfProfile
    ? selfProfile.role === "Producer" || selfProfile.role === "Director"
    : false;

  const myProjects = projects.filter((p) => p.producerId === currentUserId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    myProjects.length > 0 ? myProjects[0].projectId : ""
  );

  // States
  const [requirements, setRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommendations schemas
  const [crewRecommendations, setCrewRecommendations] = useState<AIRecommendation[]>([]);
  const [projectRecommendations, setProjectRecommendations] = useState<ProjectRecommendation[]>([]);

  // 1. RECOMMEND CREW (Producer / Director Mode)
  const handleRecommendCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirements.trim() || !selectedProjectId) {
      setError("Please specify project requirements and select an active project file.");
      return;
    }

    setLoading(true);
    setError(null);
    setCrewRecommendations([]);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements: requirements + ". Match budget daily rate constraints.",
          profiles,
        }),
      });

      if (!response.ok) {
        throw new Error("AI engine failed to process matching crew. Check parameters.");
      }

      const data = await response.json();
      setCrewRecommendations(data.recommendations || []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve matching crew.");
    } finally {
      setLoading(false);
    }
  };

  // 2. RECOMMEND PROJECTS (Crew Mode)
  const handleRecommendProjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfProfile) {
      setError("Please create your filmmaker profile first.");
      return;
    }

    setLoading(true);
    setError(null);
    setProjectRecommendations([]);

    // Filter projects that are upcoming or ongoing
    const activeProjects = projects.filter(
      (p) => p.status === "Pre-Production" || p.status === "Production"
    );

    try {
      const response = await fetch("/api/recommend-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: selfProfile,
          projects: activeProjects,
        }),
      });

      if (!response.ok) {
        throw new Error("AI project matching node failed to compile recommendations.");
      }

      const data = await response.json();
      setProjectRecommendations(data.recommendations || []);
    } catch (err: any) {
      setError(err.message || "Failed to compile custom project listings.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCrew = async (rec: AIRecommendation) => {
    const candidateProfile = profiles.find((p) => p.userId === rec.userId);
    if (!candidateProfile || !selectedProjectId) return;

    try {
      await onAddCrewToProject(selectedProjectId, candidateProfile);
      alert(`Successfully added ${candidateProfile.name} to this project active roster.`);
    } catch (err: any) {
      alert("Error pairing filmmaker: " + err.message);
    }
  };

  const handleApplyToProject = async (projRec: ProjectRecommendation) => {
    if (!selfProfile) return;
    try {
      await onAddCrewToProject(projRec.projectId, selfProfile);
      alert(`Applied! Your request to join the crew of "${projRec.title}" has been sent to the Producer.`);
    } catch (err: any) {
      alert("Failed to submit request: " + err.message);
    }
  };

  const targetProject = projects.find((p) => p.projectId === selectedProjectId);

  // Default block if no profile is built yet
  if (!selfProfile) {
    return (
      <div className="bg-[#F5EFEB] border border-[#3E2723]/25 p-8 rounded-2xl text-center max-w-lg mx-auto space-y-4 shadow-md">
        <Brain className="w-12 h-12 text-[#D4AF37] mx-auto animate-bounce" />
        <h3 className="text-lg font-black text-[#3E2723] uppercase tracking-widest font-display">
          AI ENGINE LOCKED
        </h3>
        <p className="text-xs text-[#3E2723]/80 leading-relaxed">
          Please set up your filmmaker profile on the top bar card first. Once registered, the AI Matchmaker will unlock advanced matching pipelines tailored specifically to your active career path!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans text-[#3E2723]">
      {/* Dynamic Header based on role */}
      <div className="bg-[#F5EFEB] border border-[#3E2723]/25 p-6 rounded-2xl shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-shadow duration-300">
        <h2 className="text-xl font-black text-[#3E2723] tracking-widest font-display flex items-center gap-2.5 uppercase">
          <Sparkles className="w-5 h-5 text-[#D4AF37] drop-shadow-[0_0_6px_rgba(212,175,55,0.7)]" />
          {isProducerOrDirector ? "AI Crew Recommendation Engine" : "AI Project Matchmaker"}
        </h2>
        <p className="text-xs text-[#3E2723]/80 mt-1">
          {isProducerOrDirector
            ? "Producer & Director Suite: Perform deep neural matches on the registered filmmaker roster based on your specific project budgets (₹)."
            : "Filmmaker Crew Suite: Locate ongoing and upcoming film productions tailored specifically to your daily rate expectation (₹), skills, and credits."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Control Panel */}
        <div className="bg-[#F5EFEB] border border-[#3E2723]/25 p-5 md:p-6 rounded-2xl shadow-sm space-y-4 md:col-span-1">
          <h3 className="text-xs uppercase tracking-widest text-[#3E2723] font-black font-display border-b border-[#3E2723]/15 pb-2">
            Match Query Parameters
          </h3>

          {isProducerOrDirector ? (
            /* PRODUCER FORM */
            <form onSubmit={handleRecommendCrew} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1.5 font-mono">
                  Select Active Production
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded-xl p-3 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                >
                  <option value="" className="bg-[#FAF5EF]">-- Choose Project --</option>
                  {myProjects.map((p) => (
                    <option key={p.projectId} value={p.projectId} className="bg-[#FAF5EF]">
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirements & inputs text entry boxes */}
              <div>
                <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1.5 font-mono">
                  Production Requirements & Rate Bound
                </label>
                <textarea
                  rows={6}
                  required
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded-xl p-3 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] leading-normal font-medium"
                  placeholder="e.g. Need a chief cinematographer who has experience shooting commercial projects, rate under ₹50,000/day..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !requirements.trim() || !selectedProjectId}
                className="w-full bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] font-black py-2.5 rounded-xl text-xs uppercase tracking-widest hover:shadow-[0_0_10px_rgba(212,175,55,0.4)] transition cursor-pointer disabled:opacity-50 select-none"
              >
                {loading ? "Scanning Database..." : "Inference Crew Match"}
              </button>
            </form>
          ) : (
            /* CREW FORM */
            <div className="space-y-4">
              <div className="bg-[#FAF5EF] p-4 rounded-xl border border-[#3E2723]/10 space-y-2 text-xs">
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-[#3E2723]/60 mb-2 font-mono">My Parameters</p>
                <div className="flex justify-between border-b border-[#3E2723]/5 pb-1">
                  <span className="font-semibold text-[#3E2723]/75">My Role:</span>
                  <span className="font-bold">{selfProfile.role}</span>
                </div>
                <div className="flex justify-between border-b border-[#3E2723]/5 pb-1 block">
                  <span className="font-semibold text-[#3E2723]/75">Required Rate:</span>
                  <span className="font-black text-[#D4AF37]">₹{selfProfile.budgetExpectation.toLocaleString()}/day</span>
                </div>
                <div className="flex justify-between border-b border-[#3E2723]/5 pb-1">
                  <span className="font-semibold text-[#3E2723]/75">Experience:</span>
                  <span className="font-bold">{selfProfile.experience} Years</span>
                </div>
              </div>

              <form onSubmit={handleRecommendProjects} className="space-y-2 pt-1">
                <p className="text-[10px] text-[#3E2723]/60 leading-normal font-medium mb-2">
                  Gemini will compare your daily rate, experience, and past credits against all active registered productions.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:shadow-[0_0_10px_rgba(212,175,55,0.4)] transition cursor-pointer disabled:opacity-50 select-none"
                >
                  {loading ? "Matching Projects..." : "Scan Compatible Projects"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Inference Output Grid */}
        <div className="md:col-span-2 space-y-4 font-sans text-[#3E2723]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-mono font-bold">
              {error}
            </div>
          )}

          {loading && (
            <div className="border border-[#3E2723]/25 bg-[#F5EFEB] rounded-2xl p-12 text-center space-y-3 animate-pulse shadow-sm">
              <Brain className="w-10 h-10 text-[#D4AF37] mx-auto animate-bounce" />
              <p className="text-xs text-[#3E2723] font-mono font-bold uppercase tracking-wider">
                Gemini AI is scanning production parameters against budget matrix sheets...
              </p>
            </div>
          )}

          {/* Fallback Empty States */}
          {!loading && crewRecommendations.length === 0 && projectRecommendations.length === 0 && !error && (
            <div className="border border-[#3E2723]/25 bg-[#F5EFEB] rounded-2xl p-12 text-center space-y-3 shadow-md">
              <Compass className="w-10 h-10 text-[#D4AF37] mx-auto" />
              <h4 className="text-sm font-black text-[#3E2723] uppercase tracking-wider font-display">No matches generated yet</h4>
              <p className="text-xs text-[#3E2723]/70 max-w-sm mx-auto leading-relaxed font-semibold">
                {isProducerOrDirector
                  ? "Select a project, write your constraints and start scanning for matching filmmaking talent!"
                  : "Click the trigger to find production projects looking for your role and rates!"}
              </p>
            </div>
          )}

          {/* RENDER CREW RECOMMENDATIONS (Producer View) */}
          {!loading && isProducerOrDirector && crewRecommendations.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-[#3E2723] tracking-widest uppercase font-black border-l-2 border-[#D4AF37] pl-2">
                Ranked Filmmaking Candidates:
              </div>

              <div className="space-y-4">
                {crewRecommendations.map((rec, idx) => {
                  const isAdded = targetProject?.crewMembers?.some((m) => m.userId === rec.userId);
                  const matchProfile = profiles.find((prof) => prof.userId === rec.userId);

                  return (
                    <div
                      key={rec.userId}
                      className="bg-[#F5EFEB] border border-[#3E2723]/15 p-5 rounded-2xl shadow-sm hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] transition duration-300"
                    >
                      <div className="flex justify-between items-start border-b border-[#3E2723]/15 pb-3 mb-3.5 gap-3">
                        <div className="flex items-center gap-3">
                          {matchProfile?.avatarUrl ? (
                            <img
                              src={matchProfile.avatarUrl}
                              alt={rec.name}
                              className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/50 bg-stone-100 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-[#3E2723]/10 border border-[#D4AF37]/30 flex items-center justify-center text-xs font-black text-[#3E2723] uppercase font-mono shrink-0">
                              {rec.name ? rec.name.slice(0, 2) : "CF"}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[8px] bg-[#D4AF37]/15 text-[#3E2723] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                                MATCH #{idx + 1}
                              </span>
                              <h4 className="text-[#3E2723] font-black text-sm tracking-wide font-display uppercase">
                                {rec.name}
                              </h4>
                            </div>
                            <p className="text-[#3E2723]/70 text-[10px] font-mono font-bold mt-0.5 uppercase">{rec.role}</p>
                            {(matchProfile?.city || matchProfile?.state) && (
                              <p className="flex items-center gap-0.5 text-[9px] text-[#3E2723]/60 font-bold mt-0.5">
                                <MapPin className="w-3 h-3 text-[#D4AF37]/80 shrink-0" />
                                <span>
                                  {[matchProfile.city, matchProfile.state].filter(Boolean).join(", ")}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-black font-mono text-[#D4AF37] block">
                            {rec.matchScore}%
                          </span>
                          <span className="text-[10px] text-[#3E2723]/60 uppercase tracking-widest font-mono font-bold block">
                            Match Matrix
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 font-sans">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#3E2723] font-bold block mb-1">
                            COMPATIBILITY LOGS & REASONING
                          </span>
                          <p className="text-xs text-[#3E2723]/95 leading-relaxed bg-[#FAF5EF] p-3 rounded-lg border border-[#3E2723]/10 font-medium">
                            {rec.reasoning}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-[#3E2723]/60 font-mono font-bold block uppercase text-[9px]">Experience:</span>
                            <span className="font-black text-[#3E2723]">{rec.experienceYears} Years</span>
                          </div>
                          <div>
                            <span className="text-[#3E2723]/60 font-mono font-bold block uppercase text-[9px]">Expected Rate:</span>
                            <span className="font-black text-[#3E2723] font-mono">
                              ₹{rec.expectedRate.toLocaleString()}/day
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-[#3E2723]/10 flex justify-end">
                          {isAdded ? (
                            <span className="text-[10px] uppercase font-mono tracking-widest text-green-700 flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg font-bold select-none">
                              <ShieldCheck className="w-3.5 h-3.5" /> Added to crew
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddCrew(rec)}
                              className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:shadow-[0_0_12px_rgba(212,175,55,0.4)] cursor-pointer transition select-none"
                            >
                              Add as Invited Crew
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RENDER PROJECT RECOMMENDATIONS (Crew View) */}
          {!loading && !isProducerOrDirector && projectRecommendations.length > 0 && (
            <div className="space-y-4 font-sans text-[#3E2723]">
              <div className="text-xs font-mono text-[#3E2723] tracking-widest uppercase font-black border-l-2 border-[#D4AF37] pl-2">
                Ranked Film Productions matched:
              </div>

              <div className="space-y-4">
                {projectRecommendations.map((projRec, idx) => {
                  const correlatedProj = projects.find((p) => p.projectId === projRec.projectId);
                  const isAlreadyInCrew = correlatedProj?.crewMembers?.some(
                    (m) => m.userId === currentUserId
                  );

                  return (
                    <div
                      key={projRec.projectId}
                      className="bg-[#F5EFEB] border border-[#3E2723]/15 p-5 rounded-2xl shadow-sm hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.25)] transition duration-300"
                    >
                      <div className="flex justify-between items-start border-b border-[#3E2723]/15 pb-3 mb-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] bg-[#D4AF37]/15 text-[#3E2723] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              MATCH COMPOSITE #{idx + 1}
                            </span>
                            <h4 className="text-[#3E2723] font-black text-sm tracking-wide font-display uppercase">
                              {projRec.title}
                            </h4>
                          </div>
                          <span className="text-[10px] block opacity-70 mt-1 uppercase font-mono font-bold tracking-wider">
                            Status: {correlatedProj ? correlatedProj.status : "Upcoming"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black font-mono text-[#D4AF37] block">
                            {projRec.matchScore}%
                          </span>
                          <span className="text-[10px] text-[#3E2723]/60 uppercase tracking-widest font-mono font-bold">
                            Match Matrix
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 font-sans">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#3E2723] font-bold block mb-1">
                            Budget Compartment & Compatibility Summary
                          </span>
                          <p className="text-xs text-[#3E2723]/95 leading-relaxed bg-[#FAF5EF] p-3 rounded-lg border border-[#3E2723]/10 font-medium">
                            {projRec.reasoning}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#3E2723]/60 font-bold font-mono block">
                            Budget Suitability
                          </span>
                          <span className="text-xs font-extrabold text-[#D4AF37] font-mono">
                            {projRec.rateCompatibility}
                          </span>
                        </div>

                        {/* Apply button */}
                        <div className="pt-3 border-t border-[#3E2723]/10 flex justify-end">
                          {isAlreadyInCrew ? (
                            <span className="text-[10px] uppercase font-mono tracking-widest text-green-700 flex items-center gap-1 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-lg font-bold select-none">
                              <ShieldCheck className="w-3.5 h-3.5" /> Request Submitted
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplyToProject(projRec)}
                              className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:shadow-[0_0_12px_rgba(212,175,55,0.4)] cursor-pointer transition select-none"
                            >
                              Request Access to Join Crew
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
