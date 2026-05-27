import React, { useState } from "react";
import { Project, Profile, Schedule } from "../types";
import { Calendar, Clock, MapPin, FileText, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";

interface CalendarSystemProps {
  schedules: Schedule[];
  projects: Project[];
  profiles: Profile[];
  currentUserId: string;
  userGoogleToken: string | null;
  onSaveSchedule: (schedule: Partial<Schedule>) => Promise<void>;
  onDeleteSchedule: (scheduleId: string) => Promise<void>;
}

export default function CalendarSystem({
  schedules,
  projects,
  profiles,
  currentUserId,
  userGoogleToken,
  onSaveSchedule,
  onDeleteSchedule,
}: CalendarSystemProps) {
  const myProducerProjects = projects.filter((p) => p.producerId === currentUserId);

  // Form states
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [callTime, setCallTime] = useState("");
  const [callSheetUrl, setCallSheetUrl] = useState("");
  const [productionNotes, setProductionNotes] = useState("");
  const [chosenCrewUserIds, setChosenCrewUserIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(false);

  // Filter schedules that apply to the current user (either they are producer or they are listed as crew member)
  const mySchedules = schedules.filter((s) => {
    const isProducer = projects.some(
      (p) => p.projectId === s.projectId && p.producerId === currentUserId
    );
    const isCrew = s.crewList && s.crewList.includes(currentUserId);
    return isProducer || isCrew;
  });

  const activeNewProject = projects.find((p) => p.projectId === selectedProjectId);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !date || !location || !callTime) return;

    setSaving(true);
    try {
      const scheduleId = "sched_" + Math.random().toString(36).substr(2, 9);
      const newSchedule: Partial<Schedule> = {
        scheduleId,
        projectId: selectedProjectId,
        projectTitle: activeNewProject?.title || "Film Project",
        date,
        location,
        callTime,
        callSheetUrl,
        productionNotes,
        crewList: chosenCrewUserIds,
      };

      await onSaveSchedule(newSchedule);

      // Reset
      setDate("");
      setLocation("");
      setCallTime("");
      setCallSheetUrl("");
      setProductionNotes("");
      setChosenCrewUserIds([]);
    } catch (err: any) {
      alert("Error saving schedule: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToGoogleCalendar = async (sched: Schedule) => {
    if (!userGoogleToken) {
      setSyncStatus("No Google access token found matching calendar permissions. Register via Login.");
      return;
    }

    setSyncProgress(true);
    setSyncStatus(null);

    try {
      // Craft title and dates for shoot event
      const summary = `FILM HUB - ${sched.projectTitle} Shoot`;
      const startDateTime = `${sched.date}T${sched.callTime}:00`;
      // End date time is defaulted core 8 hours later
      const callHour = Number(sched.callTime.split(":")[0]);
      const callMin = Number(sched.callTime.split(":")[1]);
      const endHour = (callHour + 8) % 24;
      const endHourStr = endHour < 10 ? `0${endHour}` : `${endHour}`;
      const endDateTime = `${sched.date}T${endHourStr}:${callMin < 10 ? "0" + callMin : callMin}:00`;

      // Get crew member names
      const crewNames = sched.crewList
        .map((uid) => {
          const prof = profiles.find((p) => p.userId === uid);
          return prof ? `- ${prof.name} (${prof.role})` : `- Unknown ID: ${uid}`;
        })
        .join("\n");

      const description = `FILM HUB PRODUCTION UPDATE

Your call time is exactly scheduled.
Location coordinates: ${sched.location}
Call Time: ${sched.callTime}
Call Sheet link/details: ${sched.callSheetUrl || "No digital sheets attached."}

Special Production Notes:
${sched.productionNotes || "Keep rolling. Speed!"}

Assigned Crew List:
${crewNames || "No crew detailed yet."}
`;

      const eventPayload = {
        summary,
        location: sched.location,
        description,
        start: {
          dateTime: new Date(startDateTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(endDateTime).toISOString(),
          timeZone: "UTC",
        },
      };

      const endpoint = sched.googleEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${sched.googleEventId}`
        : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

      const method = sched.googleEventId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${userGoogleToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      if (!res.ok) {
        throw new Error("Google Calendar API returned status " + res.status);
      }

      const responseData = await res.json();

      // Save google event id on our database
      await onSaveSchedule({
        ...sched,
        googleEventId: responseData.id,
      });

      setSyncStatus(`Shoot synced with Google Calendar event: ${responseData.id}`);
    } catch (err: any) {
      console.error("Google Calendar Sync failed:", err);
      setSyncStatus("Failed to synchronize with Google Account: " + err.message);
    } finally {
      setSyncProgress(false);
    }
  };

  const handleCrewToggle = (userId: string) => {
    if (chosenCrewUserIds.includes(userId)) {
      setChosenCrewUserIds(chosenCrewUserIds.filter((id) => id !== userId));
    } else {
      setChosenCrewUserIds([...chosenCrewUserIds, userId]);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side: Create Shoot Schedule */}
        {myProducerProjects.length > 0 && (
          <div className="md:w-1/3 bg-[#F5EFEB] border border-[#3E2723]/25 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#3E2723] border-b border-[#3E2723]/15 pb-2 font-display">
              Schedule Production Day
            </h3>

            <form onSubmit={handleCreateSchedule} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1.5 font-mono">
                  Active Production File
                </label>
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                >
                  <option value="" className="bg-[#FAF5EF]">-- Choose Project --</option>
                  {myProducerProjects.map((p) => (
                    <option key={p.projectId} value={p.projectId} className="bg-[#FAF5EF]">
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {activeNewProject && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1 font-mono">
                        Shoot Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1 font-mono">
                        Call Time (HH:MM)
                      </label>
                      <input
                        type="time"
                        required
                        value={callTime}
                        onChange={(e) => setCallTime(e.target.value)}
                        className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2 text-xs text-[#3E2723] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1 font-mono">
                      Shoot Location
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2.5 text-xs text-[#3E2723] font-extrabold focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      placeholder="e.g. Stage 4, Paramount Studios"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1 font-mono">
                      Call Sheet Link
                    </label>
                    <input
                      type="text"
                      value={callSheetUrl}
                      onChange={(e) => setCallSheetUrl(e.target.value)}
                      className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2.5 text-xs text-[#3E2723] font-mono focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold mb-1 font-mono">
                      Production Call Notes
                    </label>
                    <textarea
                      rows={3}
                      value={productionNotes}
                      onChange={(e) => setProductionNotes(e.target.value)}
                      className="w-full bg-[#FAF5EF] border border-[#3E2723]/25 rounded p-2 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      placeholder="Rig camera package, stage craft active..."
                    />
                  </div>

                  {/* Allocated Crew selection list */}
                  {activeNewProject.crewMembers && activeNewProject.crewMembers.length > 0 && (
                    <div className="space-y-1.5 border-t border-[#3E2723]/15 pt-3">
                      <label className="block text-[10px] uppercase text-[#3E2723]/70 font-bold font-mono">
                        Allocate Confirmed Crew
                      </label>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                        {activeNewProject.crewMembers
                          .filter((m) => m.status === "confirmed")
                          .map((m) => (
                            <label
                              key={m.userId}
                              className="flex items-center gap-2 cursor-pointer font-sans text-xs text-[#3E2723]"
                            >
                              <input
                                type="checkbox"
                                checked={chosenCrewUserIds.includes(m.userId)}
                                onChange={() => handleCrewToggle(m.userId)}
                                className="accent-[#D4AF37]"
                              />
                              <span className="font-medium">{m.name} ({m.role})</span>
                            </label>
                          ))}
                        {activeNewProject.crewMembers.filter((m) => m.status === "confirmed")
                          .length === 0 && (
                          <p className="text-[10px] text-stone-500 italic font-bold">
                            No crew members have accepted and confirmed invitation status yet on this production.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] font-bold py-2.5 rounded-lg text-xs uppercase tracking-widest hover:shadow-[0_0_12px_rgba(212,175,55,0.4)] cursor-pointer transition disabled:opacity-50 select-none"
                  >
                    {saving ? "Scheduling Day..." : "Commit Shoot Day"}
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {/* Right Side: The Timeline View */}
        <div className="flex-1 space-y-4">
          {syncStatus && (
            <div className="p-4 rounded-xl border bg-green-50 border-green-200 text-green-800 flex items-start gap-2 text-xs font-mono font-bold shadow-inner">
              <Check className="w-4 h-4 text-green-700 shrink-0" />
              <div>{syncStatus}</div>
            </div>
          )}

          <h3 className="text-sm font-black text-[#3E2723] tracking-widest font-display uppercase border-l-2 border-[#D4AF37] pl-2">
            FILM PRODUCTION SCHEDULE TIMELINE
          </h3>

          <div className="space-y-4">
            {mySchedules.length === 0 ? (
              <div className="border border-[#3E2723]/25 bg-[#F5EFEB] rounded-xl p-12 text-center max-w-md mx-auto space-y-3 shadow-md">
                <Calendar className="w-10 h-10 text-[#D4AF37] mx-auto animate-bounce" />
                <h4 className="text-sm font-black text-[#3E2723] uppercase tracking-wider font-display">No scheduled shooting days</h4>
                <p className="text-xs text-[#3E2723]/70 leading-relaxed font-sans font-bold">
                  Choose an active production and click "Schedule Production Day" to create shoot sheets and enable remote crew auto-synchronizations!
                </p>
              </div>
            ) : (
              mySchedules
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((sched) => {
                  const proj = projects.find((p) => p.projectId === sched.projectId);
                  const isProducer = proj?.producerId === currentUserId;

                  return (
                    <div
                      key={sched.scheduleId}
                      className="bg-[#F5EFEB] border border-[#3E2723]/20 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-[#D4AF37]/80 hover:shadow transition"
                    >
                      <div className="space-y-2.5 text-[#3E2723]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] bg-[#D4AF37]/15 text-[#3E2723] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            {sched.projectTitle}
                          </span>
                          <span className="text-xs text-[#3E2723]/70 font-extrabold font-mono">
                            {sched.date}
                          </span>
                        </div>

                        {/* Schedule Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-1.5 font-mono font-bold">
                            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                            Call Time: {sched.callTime}
                          </div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                            Location: {sched.location}
                          </div>
                        </div>

                        {sched.callSheetUrl && (
                          <div className="flex gap-1.5 items-center text-xs text-[#D4AF37] font-mono font-bold">
                            <FileText className="w-3.5 h-3.5" />
                            Call Sheet:{" "}
                            <a
                              href={sched.callSheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline hover:text-[#0A192F]"
                            >
                              Open Worksheet
                            </a>
                          </div>
                        )}

                        {sched.productionNotes && (
                          <div className="text-xs text-[#3E2723] bg-[#FAF5EF] p-3 rounded-lg border border-[#3E2723]/15 max-w-xl font-medium leading-relaxed shadow-inner">
                            <span className="font-bold text-[#D4AF37] block text-[9px] uppercase tracking-wider mb-1 font-mono">
                              Production notes / Directives
                            </span>
                            {sched.productionNotes}
                          </div>
                        )}

                        {/* Crew assigned labels */}
                        {sched.crewList && sched.crewList.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap gap-1 items-center font-bold">
                            <span className="text-[10px] text-[#3E2723]/60 mr-1 font-mono uppercase">
                              Assigned Crew:
                            </span>
                            {sched.crewList.map((uid) => {
                              const prof = profiles.find((p) => p.userId === uid);
                              return (
                                <span
                                  key={uid}
                                  className="text-[9px] px-2 py-0.5 bg-[#FAF5EF] border border-[#3E2723]/10 text-[#3E2723] rounded "
                                >
                                  {prof ? prof.name : "Crew Id " + uid}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sync actions */}
                      <div className="flex flex-row md:flex-col sm:items-end gap-2 shrink-0 border-t border-[#3E2723]/10 pt-3 md:border-none md:pt-0">
                        {userGoogleToken ? (
                          <button
                            onClick={() => handleSyncToGoogleCalendar(sched)}
                            disabled={syncProgress}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow transition cursor-pointer select-none ${
                              sched.googleEventId
                                ? "bg-green-100 border border-green-300 text-green-800"
                                : "bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F]"
                            }`}
                          >
                            <RefreshCw className={`w-3 h-3 ${syncProgress ? "animate-spin" : ""}`} />
                            {sched.googleEventId ? "Update Google" : "Google Sync"}
                          </button>
                        ) : (
                          <span className="text-[9px] text-[#3E2723]/60 block max-w-[130px] font-bold italic leading-tight text-right">
                            Sign in with Google to enable Google Calendar synchronization services.
                          </span>
                        )}

                        {isProducer && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Delete this scheduled shooting date?")) {
                                await onDeleteSchedule(sched.scheduleId);
                              }
                            }}
                            className="bg-transparent hover:bg-red-50 hover:text-red-800 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition"
                          >
                            Remove Day
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
