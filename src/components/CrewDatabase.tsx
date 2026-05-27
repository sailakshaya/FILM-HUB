import React, { useState } from "react";
import { Profile } from "../types";
import { Search, SlidersHorizontal, User2, Globe, Star, Mail, Phone, ExternalLink, CalendarDays, MapPin } from "lucide-react";

interface CrewDatabaseProps {
  profiles: Profile[];
  currentUserId: string | null;
  onSelectCrew?: (crew: Profile) => void;
  onEditSelfProfile?: () => void;
  selfProfile: Profile | null;
}

export default function CrewDatabase({
  profiles,
  currentUserId,
  onSelectCrew,
  onEditSelfProfile,
  selfProfile,
}: CrewDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [minExp, setMinExp] = useState<number>(0);
  const [maxRate, setMaxRate] = useState<number>(150000); // Daily rate threshold limit
  const [showFilters, setShowFilters] = useState(false);

  // Selected profile for full details view
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  const filmRoles = [
    "All",
    "Director",
    "Producer",
    "Cinematographer",
    "Screenwriter",
    "Sound Recorder / Designer",
    "Editor",
    "Production Designer",
    "Actor / Actress",
    "Gaffer",
    "Key Grip",
    "Makeup Artist",
    "Colorist",
    "Visual Effects Artist",
    "Composer",
  ];

  // Filtering profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.bio && p.bio.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === "All" || p.role === roleFilter;
    const matchesExp = p.experience >= minExp;
    const matchesRate = p.budgetExpectation <= maxRate;

    return matchesSearch && matchesRole && matchesExp && matchesRate;
  });

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Banner / Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F5EFEB] border border-[#3E2723]/20 p-6 rounded-2xl shadow-md hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-shadow duration-300">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#3E2723] tracking-wider font-display uppercase">
            THE FILMMAKER ROSTER
          </h2>
          <p className="text-xs text-[#3E2723]/80 mt-1">
            Browse and connect with registered cinematographers, editors, sound designers, and directors in local and global markets.
          </p>
        </div>
        <div className="flex gap-3">
          {selfProfile ? (
            <button
              onClick={onEditSelfProfile}
              className="bg-transparent text-[#3E2723] hover:text-[#0A192F] hover:bg-[#3E2723]/5 border border-[#3E2723]/40 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              Update My Profile
            </button>
          ) : (
            currentUserId && (
              <button
                onClick={onEditSelfProfile}
                className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] hover:shadow-[0_0_12px_rgba(212,175,55,0.4)] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Create My Crew Profile
              </button>
            )
          )}
        </div>
      </div>

      {/* Roster Controls */}
      <div className="bg-[#F5EFEB] border border-[#3E2723]/20 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Search by name, biography keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition font-sans"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37] w-full sm:w-48 cursor-pointer transition"
          >
            {filmRoles.map((role) => (
              <option key={role} value={role} className="bg-[#FAF5EF]">
                {role}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 border px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer select-none font-mono font-bold ${
              showFilters
                ? "bg-[#D4AF37]/15 text-[#3E2723] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                : "bg-transparent text-[#3E2723]/80 border-[#3E2723]/30 hover:border-[#3E2723]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-[#F5EFEB] border border-[#3E2723]/20 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
          {/* Min Experience */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-[#3E2723]/80 font-bold">
              <span className="uppercase tracking-widest">Min Experience</span>
              <span className="font-mono text-[#D4AF37] font-black">{minExp} Years</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              value={minExp}
              onChange={(e) => setMinExp(Number(e.target.value))}
              className="w-full h-1 bg-[#3E2723]/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>

          {/* Max Rate Limit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-[#3E2723]/80 font-bold">
              <span className="uppercase tracking-widest font-mono">Max Daily Rate Limit</span>
              <span className="font-mono text-[#D4AF37] font-black">₹{maxRate.toLocaleString()}/day</span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="5000"
              value={maxRate}
              onChange={(e) => setMaxRate(Number(e.target.value))}
              className="w-full h-1 bg-[#3E2723]/20 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>
      )}

      {/* Search results count */}
      <div className="text-xs text-[#3E2723]/60 font-mono font-bold uppercase tracking-wider pl-2 border-l-2 border-[#D4AF37]">
        {filteredProfiles.length} dynamic filmmaker profile(s) listed on the FILM HUB database
      </div>

      {/* Roster Cards Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="border border-[#3E2723]/20 bg-[#F5EFEB] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-md">
          <User2 className="w-12 h-12 text-[#D4AF37] mx-auto animate-bounce" />
          <h3 className="text-lg font-black text-[#3E2723] uppercase tracking-widest font-display">
            No Filmmakers Registered
          </h3>
          <p className="text-xs text-[#3E2723]/80 leading-relaxed font-sans">
            The matching registry is empty. If you are demoing or starting this project, click "Create My Crew Profile" or create one to populate real, dynamic data!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((p) => (
            <div
              key={p.userId}
              className="bg-[#F5EFEB] border border-[#3E2723]/15 rounded-2xl p-6 shadow-md hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.35)] transition-all duration-300 group flex flex-col justify-between"
            >
              {/* Card Main */}
              <div>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="flex items-center gap-3">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/50 bg-stone-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#3E2723]/10 border border-[#D4AF37]/30 flex items-center justify-center text-xs font-black text-[#3E2723] uppercase font-mono shrink-0">
                        {p.name ? p.name.slice(0, 2) : "CF"}
                      </div>
                    )}
                    <div>
                      <h3 className="text-[#3E2723] font-black font-display group-hover:text-[#D4AF37] transition text-sm tracking-wide uppercase">
                        {p.name}
                      </h3>
                      <p className="text-[#D4AF37] text-[10px] font-mono tracking-wider uppercase mt-0.5 font-bold">
                        {p.role}
                      </p>
                      {(p.city || p.state) && (
                        <p className="flex items-center gap-0.5 text-[9px] text-[#3E2723]/60 font-bold mt-0.5">
                          <MapPin className="w-3 h-3 text-[#D4AF37]/80 shrink-0" />
                          <span className="truncate max-w-[110px]">
                            {[p.city, p.state].filter(Boolean).join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[8px] uppercase font-mono tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                      p.availability === "Available"
                        ? "bg-green-500/10 text-green-800 border-green-500/30 font-bold"
                        : p.availability === "Part-Time"
                        ? "bg-amber-500/10 text-amber-800 border-amber-500/30 font-bold"
                        : "bg-red-500/10 text-red-800 border-red-500/30 font-bold"
                    }`}
                  >
                    {p.availability}
                  </span>
                </div>

                <p className="text-xs text-[#3E2723]/80 line-clamp-3 min-h-[3rem] font-sans mb-4 leading-relaxed font-semibold">
                  {p.bio || "No biography provided by this filmmaker."}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 border-t border-[#3E2723]/10 pt-3 mb-4 text-[11px] text-[#3E2723]/80">
                  <div className="font-sans flex items-center gap-1 font-bold">
                    <span className="font-mono text-[#D4AF37] font-black">{p.experience}</span>{" "}
                    yrs experience
                  </div>
                  <div className="font-mono text-right text-[#3E2723] font-black">
                    <span className="text-[#D4AF37] font-black">₹{p.budgetExpectation.toLocaleString()}</span>/day
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#3E2723]/10 mt-auto">
                <button
                  onClick={() => setActiveProfile(p)}
                  className="flex-1 text-center bg-[#FAF5EF] hover:bg-[#3E2723]/5 border border-[#3E2723]/30 text-xs font-black py-2.5 rounded-xl text-[#3E2723] transition uppercase tracking-wider cursor-pointer"
                >
                  View Profile Portfolio
                </button>
                {onSelectCrew && p.userId !== currentUserId && (
                  <button
                    onClick={() => onSelectCrew(p)}
                    className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] hover:shadow-[0_0_10px_rgba(212,175,55,0.4)] font-black px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer transition select-none"
                    title="Recommend / Add to production crew list"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cinematic Portfolio Detail Modal */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F]/60 backdrop-blur-sm transition animate-fadeIn">
          <div className="bg-[#FAF5EF] border border-[#3E2723]/25 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative text-[#3E2723]">
            {/* Close Button */}
            <button
              onClick={() => setActiveProfile(null)}
              className="absolute top-4 right-4 text-[#3E2723]/60 hover:text-[#3E2723] font-mono text-lg font-black bg-[#F5EFEB] hover:bg-[#D4AF37]/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>

            {/* Profile Info */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center border-b border-[#3E2723]/15 pb-5 mb-6 justify-between">
              <div className="flex items-center gap-4">
                {activeProfile.avatarUrl ? (
                  <img
                    src={activeProfile.avatarUrl}
                    alt={activeProfile.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37] bg-stone-100 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#3E2723]/10 border-2 border-[#D4AF37]/50 flex items-center justify-center text-lg font-black text-[#3E2723] uppercase font-mono shadow-sm">
                    {activeProfile.name ? activeProfile.name.slice(0, 2) : "CF"}
                  </div>
                )}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black font-display text-[#3E2723] uppercase">
                    {activeProfile.name}
                  </h3>
                  <p className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono font-black mt-0.5">
                    {activeProfile.role}
                  </p>
                  {(activeProfile.city || activeProfile.state) && (
                    <p className="flex items-center gap-1 text-xs text-[#3E2723]/70 font-semibold font-sans mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      <span>{[activeProfile.city, activeProfile.state].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                    <span className="text-[#D4AF37] flex">
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37] stroke-none" />
                    </span>
                    <span className="font-mono text-[#3E2723] font-black">
                      {activeProfile.ratings || "4.8"}
                    </span>
                    <span className="text-[#3E2723]/60 font-bold">/ 5.0 rating</span>
                  </div>
                </div>
              </div>
              <div className="sm:text-right self-stretch sm:self-center flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end border-t sm:border-t-0 border-[#3E2723]/10 pt-3 sm:pt-0">
                <span className="inline-block px-3 py-1 bg-[#F5EFEB] text-[#3E2723] border border-[#3E2723]/25 font-black rounded-full text-[9px] uppercase tracking-wider">
                  {activeProfile.availability}
                </span>
                <p className="text-sm font-mono font-black text-[#D4AF37] sm:mt-2">
                  ₹{activeProfile.budgetExpectation.toLocaleString()}/day
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-6 text-[#3E2723]">
              {/* About */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                  About
                </h4>
                <p className="text-xs text-[#3E2723]/95 leading-relaxed font-medium bg-[#F5EFEB] p-4 rounded-xl border border-[#3E2723]/10">
                  {activeProfile.bio || "No biography details registered for this crew profile."}
                </p>
              </div>

              {/* Languages */}
              {activeProfile.languages && activeProfile.languages.length > 0 && (
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                    Spoken Languages
                  </h4>
                  <div className="flex flex-wrap gap-1.5 text-xs text-[#3E2723]/95 font-bold">
                    {activeProfile.languages.join(", ")}
                  </div>
                </div>
              )}

              {/* Custom Social / Professional Links */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#D4AF37] drop-shadow-[0_0_4px_rgba(212,175,55,0.7)]" />
                  Social & Reel Links
                </h4>
                {activeProfile.socialLinks && activeProfile.socialLinks.length > 0 ? (
                  <div className="space-y-2">
                    {activeProfile.socialLinks.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-[#D4AF37] hover:text-[#0A192F] font-mono bg-[#F5EFEB] border border-[#3E2723]/10 p-3 rounded-xl transition hover:shadow-sm"
                      >
                        <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#3E2723]/50 italic">No external links uploaded yet.</p>
                )}
              </div>

              {/* Cinematic History (Project Title and Year Only) */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Production Credits & Filmography
                </h4>
                {activeProfile.previousProjects && activeProfile.previousProjects.length > 0 ? (
                  <div className="space-y-2">
                    {activeProfile.previousProjects.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs border border-[#3E2723]/10 bg-[#F5EFEB] p-3 rounded-xl font-bold"
                      >
                        <span className="text-[#3E2723]">{p.title}</span>
                        <span className="font-mono text-[#D4AF37]">{p.year}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#3E2723]/50 italic">No historical credits registered.</p>
                )}
              </div>

              {/* Contacts block */}
              <div className="border-t border-[#3E2723]/15 pt-6">
                <h4 className="text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-3">
                  Production Contacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-[#F5EFEB] border border-[#3E2723]/10 p-3 rounded-xl font-bold font-mono">
                    <Mail className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[#3E2723] truncate">{activeProfile.email}</span>
                  </div>
                  {activeProfile.phone && (
                    <div className="flex items-center gap-2 bg-[#F5EFEB] border border-[#3E2723]/10 p-3 rounded-xl font-bold font-mono">
                      <Phone className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-[#3E2723]">{activeProfile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#3E2723]/10 mt-8 pt-4 flex justify-end">
              <button
                onClick={() => setActiveProfile(null)}
                className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition cursor-pointer select-none"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
