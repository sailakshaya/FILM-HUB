import React, { useState } from "react";
import { Profile } from "../types";
import { Plus, Trash2, Link as LinkIcon, User, Star, Globe, Mail, Phone, ExternalLink, CalendarDays, Edit3, MapPin, Upload, Camera } from "lucide-react";

interface MyProfileDashboardProps {
  key?: string;
  initialProfile: Profile | null;
  currentUserEmail: string;
  currentUserId: string;
  onSave: (profile: Partial<Profile>) => Promise<void>;
  onCancel: () => void;
}

export default function MyProfileDashboard({
  initialProfile,
  currentUserEmail,
  currentUserId,
  onSave,
  onCancel,
}: MyProfileDashboardProps) {
  // Toggle between read-only View Details and Edit Mode
  // If no profile exists yet, start directly in Edit/Create Mode
  const [isEditing, setIsEditing] = useState<boolean>(!initialProfile);

  const [name, setName] = useState(initialProfile?.name || "");
  const [role, setRole] = useState(initialProfile?.role || "Cinematographer");
  const [experience, setExperience] = useState<number>(initialProfile?.experience || 0);
  const [budgetExpectation, setBudgetExpectation] = useState<number>(
    initialProfile?.budgetExpectation || 0
  );
  const [availability, setAvailability] = useState(initialProfile?.availability || "Available");
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [languages, setLanguages] = useState(initialProfile?.languages?.join(", ") || "English, Spanish");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [city, setCity] = useState(initialProfile?.city || "");
  const [usrState, setUsrState] = useState(initialProfile?.state || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl || "");

  // Cropping Tool States
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1.2);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragOffsetStart, setDragOffsetStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgAspect, setImgAspect] = useState<number>(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageUrl(reader.result as string);
      setCropZoom(1.2);
      setCropPan({ x: 0, y: 0 });
    };
    reader.onerror = () => {
      setError("Failed to serialize selected picture file.");
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffsetStart({ ...cropPan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCropPan({
      x: dragOffsetStart.x + dx,
      y: dragOffsetStart.y + dy,
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDragOffsetStart({ ...cropPan });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setCropPan({
      x: dragOffsetStart.x + dx,
      y: dragOffsetStart.y + dy,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgAspect(naturalWidth / naturalHeight);
  };

  const applyCrop = () => {
    if (!rawImageUrl) return;

    const img = new Image();
    img.src = rawImageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 250;
      canvas.height = 250;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill canvas background to clean cream paper color
      ctx.fillStyle = "#FAF5EF";
      ctx.fillRect(0, 0, 250, 250);

      const viewSize = 250;
      let drawW = viewSize;
      let drawH = viewSize;

      if (imgAspect > 1) {
        drawW = viewSize * imgAspect;
      } else {
        drawH = viewSize / imgAspect;
      }

      ctx.save();
      ctx.translate(viewSize / 2, viewSize / 2);
      ctx.translate(cropPan.x, cropPan.y);
      ctx.scale(cropZoom, cropZoom);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
      setAvatarUrl(croppedBase64);
      setRawImageUrl(null); // Close crop modal
    };
  };

  // Custom Links
  const [socialLinks, setSocialLinks] = useState<string[]>(() => {
    if (Array.isArray(initialProfile?.socialLinks)) {
      return initialProfile.socialLinks;
    }
    return [];
  });
  const [newSocialUrl, setNewSocialUrl] = useState("");

  // Projects - Year and title only
  const [prevProjects, setPrevProjects] = useState<{ title: string; year: number }[]>(() => {
    if (initialProfile?.previousProjects) {
      return initialProfile.previousProjects.map(p => ({
        title: p.title,
        year: p.year
      }));
    }
    return [];
  });
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjYear, setNewProjYear] = useState<number>(new Date().getFullYear());

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSocialLink = () => {
    if (!newSocialUrl.trim()) return;
    let url = newSocialUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    setSocialLinks([...socialLinks, url]);
    setNewSocialUrl("");
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const addProject = () => {
    if (!newProjTitle.trim()) return;
    setPrevProjects([
      ...prevProjects,
      { title: newProjTitle.trim(), year: Number(newProjYear) },
    ]);
    setNewProjTitle("");
  };

  const removeProject = (index: number) => {
    setPrevProjects(prevProjects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const languagesArray = languages
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      await onSave({
        userId: currentUserId,
        name,
        role,
        experience: Number(experience),
        budgetExpectation: Number(budgetExpectation),
        availability,
        bio,
        languages: languagesArray,
        previousProjects: prevProjects,
        email: currentUserEmail,
        phone,
        socialLinks: socialLinks,
        city: city.trim(),
        state: usrState.trim(),
        avatarUrl,
      });

      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save profile details.");
    } finally {
      setSaving(false);
    }
  };

  const filmRoles = [
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

  return (
    <div className="bg-[#F5EFEB] border border-[#3E2723]/25 rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto shadow-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all duration-300 text-[#3E2723]">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3E2723]/15 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center border border-[#D4AF37]/30">
            <User className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-[#3E2723] tracking-wide uppercase">
              {isEditing ? "Edit Profile" : "My Profile"}
            </h3>
            <p className="text-xs text-[#3E2723]/70 font-mono uppercase tracking-widest mt-1">
              {initialProfile ? `Roster Registry ID: ${currentUserId.slice(0, 8)}` : "Profile Setup Required"}
            </p>
          </div>
        </div>

        {!isEditing && initialProfile && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer select-none"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile Parameters
          </button>
        )}
      </div>

      {error && (
        <div className="bg-[#0A192F] border border-[#D4AF37]/50 text-[#FDFBF7] p-4 rounded-xl mb-6 text-xs font-mono select-none">
          <p className="font-bold text-[#D4AF37] uppercase tracking-wider mb-1">Inference Notice:</p>
          {error}
        </div>
      )}

      {/* READ ONLY MODE */}
      {!isEditing && initialProfile ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 bg-[#FAF5EF] border border-[#3E2723]/10 p-6 rounded-2xl">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                {initialProfile.avatarUrl ? (
                  <img
                    src={initialProfile.avatarUrl}
                    alt={initialProfile.name}
                    className="w-20 h-20 rounded-full border-2 border-[#D4AF37] object-cover bg-stone-100 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#3E2723]/10 border-2 border-[#D4AF37]/50 flex items-center justify-center text-xl font-black text-[#3E2723] uppercase font-mono tracking-wider">
                    {initialProfile.name ? initialProfile.name.slice(0, 2) : "CF"}
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-black">{initialProfile.role}</span>
                  <h4 className="text-2xl font-black uppercase text-[#3E2723] tracking-wide font-display mt-0.5">{initialProfile.name}</h4>
                  {(initialProfile.city || initialProfile.state) && (
                    <p className="flex items-center gap-1 text-xs text-[#3E2723]/70 font-semibold font-sans mt-1">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{[initialProfile.city, initialProfile.state].filter(Boolean).join(", ")}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#D4AF37]"><Star className="w-4 h-4 fill-[#D4AF37] stroke-none" /></span>
                <span className="font-mono text-[#3E2723] font-black">{initialProfile.ratings || "4.8"}</span>
                <span className="text-[#3E2723]/60 font-bold">/ 5.0 Industry Rating</span>
              </div>

              <div className="text-xs space-y-1.5 font-sans pt-2">
                <p className="flex items-center gap-2 font-bold"><span className="text-[#D4AF37] font-mono">■</span> Status: <span className="text-green-800 bg-green-500/15 px-2.5 py-0.5 rounded-full font-bold">{initialProfile.availability}</span></p>
                <p className="flex items-center gap-2 font-bold"><span className="text-[#D4AF37] font-mono">■</span> Budget Expectation: <span className="font-black text-[#D4AF37]">₹{initialProfile.budgetExpectation.toLocaleString()}/day</span></p>
                <p className="flex items-center gap-2 font-semibold"><span className="text-[#D4AF37] font-mono">■</span> Experience: <span>{initialProfile.experience} Years active in Industry</span></p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs border-t md:border-t-0 md:border-l border-[#3E2723]/15 pt-4 md:pt-0 md:pl-6 max-w-sm">
              <p className="text-[10px] uppercase text-[#3E2723]/50 font-black">Official Communications</p>
              <p className="flex items-center gap-2.5 font-bold"><Mail className="w-4 h-4 text-[#D3AF37]" /><span className="truncate">{initialProfile.email}</span></p>
              <p className="flex items-center gap-2.5 font-bold"><Phone className="w-4 h-4 text-[#D3AF37]" /><span>{initialProfile.phone || "No contact"}</span></p>
              <p className="flex items-center gap-2.5 font-semibold text-[#D4AF37]"><Globe className="w-4 h-4 text-[#D3AF37]" /><span className="truncate">{initialProfile.languages?.join(", ")}</span></p>
            </div>
          </div>

          {/* About Section */}
          <div>
            <h5 className="text-[11px] uppercase tracking-widest text-[#3E2723]/60 font-black font-mono mb-2">Cinematic Brief (About)</h5>
            <div className="bg-[#FAF5EF] p-5 rounded-2xl border border-[#3E2723]/10 text-xs leading-relaxed font-sans font-medium">
              {initialProfile.bio || "No professional bio briefing written."}
            </div>
          </div>

          {/* Custom Reel URLs */}
          <div>
            <h5 className="text-[11px] uppercase tracking-widest text-[#3E2723]/60 font-black font-mono mb-2 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
              Links & Reels (Custom Choice)
            </h5>
            {socialLinks && socialLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {socialLinks.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-[#D4AF37] font-mono bg-[#FAF5EF] border border-[#3E2723]/10 p-3 rounded-xl hover:text-[#0A192F] transition duration-300"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#3E2723]/40 italic pl-1">No custom links created yet.</p>
            )}
          </div>

          {/* Credits */}
          <div>
            <h5 className="text-[11px] uppercase tracking-widest text-[#3E2723]/60 font-black font-mono mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#D4AF37]" />
              Historical Production Credits
            </h5>
            {prevProjects && prevProjects.length > 0 ? (
              <div className="space-y-1.5">
                {prevProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs bg-[#FAF5EF] border border-[#3E2723]/10 px-4 py-3 rounded-xl font-bold"
                  >
                    <span>{proj.title}</span>
                    <span className="font-mono text-[#D4AF37]">{proj.year}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#3E2723]/40 italic pl-1">No previous projects registered.</p>
            )}
          </div>

          <div className="border-t border-[#3E2723]/10 pt-6 flex justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 border border-[#3E2723]/30 hover:border-[#3E2723] rounded-xl text-xs uppercase tracking-widest font-black text-[#3E2723] transition cursor-pointer"
            >
              ← Back to Home Roster
            </button>
          </div>
        </div>
      ) : (
        /* EDIT MODE FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cropping Modal Overlay */}
          {rawImageUrl && (
            <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#FAF5EF] border-2 border-[#D4AF37] rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl">
                <div className="text-center">
                  <h4 className="font-display font-black text-lg text-[#3E2723] uppercase tracking-wider">Crop Your Profile Photo</h4>
                  <p className="text-[11px] text-[#3E2723]/70 font-sans mt-0.5">Drag photo to position, use slider to zoom</p>
                </div>

                <div className="flex justify-center select-none">
                  <div
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUpOrLeave}
                    className="w-[250px] h-[250px] relative overflow-hidden bg-stone-950 border border-[#D4AF37]/50 rounded-2xl cursor-move flex items-center justify-center"
                  >
                    <img
                      src={rawImageUrl}
                      alt="Crop Source"
                      onLoad={handleCropImageLoad}
                      style={{
                        transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                        width: imgAspect > 1 ? "auto" : "250px",
                        height: imgAspect > 1 ? "250px" : "auto",
                      }}
                      className="max-w-none origin-center pointer-events-none select-none transition-transform duration-75"
                    />
                    {/* Circle Frame Ring Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-[25px] border-stone-950/80 mix-blend-normal" />
                    <div className="absolute inset-[25px] pointer-events-none border-2 border-dashed border-[#D4AF37] rounded-full" />
                  </div>
                </div>

                {/* Zoom control slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-[#3E2723]">
                    <span>ZOOM RANGE</span>
                    <span className="text-[#D4AF37]">{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.05"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#D4AF37] h-1.5 bg-[#3E2723]/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRawImageUrl(null)}
                    className="flex-1 border border-[#3E2723]/30 hover:bg-[#3E2723]/5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-extrabold text-[#3E2723] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="flex-1 bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] py-2.5 rounded-xl text-xs uppercase tracking-wider font-extrabold transition"
                  >
                    Apply Crop
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Picture Upload & Preview */}
          <div className="bg-[#FAF5EF] border border-[#3E2723]/10 p-5 rounded-2xl space-y-4">
            <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono">
              Profile Picture
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Current Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-sm bg-stone-50"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#3E2723]/10 border-2 border-[#D4AF37]/50 flex items-center justify-center text-stone-600 font-mono text-xs text-center p-1">
                    No Photo
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-[#0A192F] text-white p-1.5 rounded-full border border-white shadow-md">
                  <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-[10px] text-[#3E2723]/70 font-mono uppercase mb-1">Upload Picture File</label>
                  <label className="flex items-center gap-2 bg-[#F5EFEB] hover:bg-[#3E2723]/5 border border-dashed border-[#3E2723]/35 rounded-xl px-4 py-2.5 cursor-pointer text-xs font-semibold justify-center transition">
                    <Upload className="w-4 h-4 text-[#D4AF37]" />
                    <span>Select Photo (Max 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Sen"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>

            {/* Role select */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Destination
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer transition"
              >
                {filmRoles.map((r) => (
                  <option key={r} value={r} className="bg-[#FAF5EF]">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Exp Years */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Experience Years
              </label>
              <input
                type="number"
                min="0"
                max="50"
                required
                value={experience || ""}
                onChange={(e) => setExperience(Number(e.target.value))}
                placeholder="e.g. 5"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>

            {/* Budget Expectation */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Budget
              </label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={budgetExpectation || ""}
                onChange={(e) => setBudgetExpectation(Number(e.target.value))}
                placeholder="e.g. 15000"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                City / Location
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Los Angeles, London"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                State / Province / Region
              </label>
              <input
                type="text"
                value={usrState}
                onChange={(e) => setUsrState(e.target.value)}
                placeholder="e.g. Maharashtra, California, Tokyo"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>

            {/* Availability */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Active Availability Status
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer transition"
              >
                <option value="Available" className="bg-[#FAF5EF]">Available (Full-Time Shoot)</option>
                <option value="Part-Time" className="bg-[#FAF5EF]">Part-Time (Ad-Hoc / Consultant)</option>
                <option value="Busy" className="bg-[#FAF5EF]">Busy (Locked on Shoot Sequence)</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
                Primary Contact Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 555-0199 or +91 98765-43210"
                className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
              />
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
              Languages Known
            </label>
            <input
              type="text"
              required
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="English, Spanish, French, Japanese"
              className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition"
            />
          </div>

          {/* About */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono mb-2">
              About / Professional Biography
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a brief description of your stylistic background, camera systems used, or creative goals..."
              className="w-full bg-[#FAF5EF] border border-[#3E2723]/20 rounded-xl p-4 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] leading-relaxed font-sans font-medium transition"
            />
          </div>

          {/* Links of Choice */}
          <div className="space-y-3 bg-[#FAF5EF] border border-[#3E2723]/15 p-5 rounded-2xl">
            <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono">
              Social Media Link
            </label>
            
            <div className="flex gap-2.5">
              <input
                type="text"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                placeholder="e.g. myreel.com/portfolio-links"
                className="flex-1 bg-[#F5EFEB] border border-[#3E2723]/15 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={addSocialLink}
                className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] px-4 rounded-xl text-xs uppercase tracking-wider font-extrabold cursor-pointer transition select-none flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add URL
              </button>
            </div>

            {socialLinks.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {socialLinks.map((url, i) => (
                  <div
                     key={i}
                     className="flex justify-between items-center text-xs bg-[#F5EFEB]/50 border border-[#3E2723]/10 p-2.5 rounded-xl"
                  >
                    <span className="truncate pr-4 font-mono text-xs text-[#D4AF37] font-bold">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeSocialLink(i)}
                      className="text-red-700 hover:text-red-900 transition p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Previous Filmography / Projects (Title and Year Only) */}
          <div className="space-y-3 bg-[#FAF5EF] border border-[#3E2723]/15 p-5 rounded-2xl">
            <label className="block text-[11px] uppercase tracking-wider text-[#3E2723] font-black font-mono">
              Previous Works
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Film/Project Title"
                value={newProjTitle}
                onChange={(e) => setNewProjTitle(e.target.value)}
                className="sm:col-span-2 bg-[#F5EFEB] border border-[#3E2723]/15 rounded-xl px-4 py-2.5 text-xs text-[#3E2723]"
              />
              <input
                type="number"
                placeholder="Release/Shoot Year"
                value={newProjYear || ""}
                onChange={(e) => setNewProjYear(Number(e.target.value))}
                className="bg-[#F5EFEB] border border-[#3E2723]/15 rounded-xl px-4 py-2.5 text-xs text-[#3E2723] font-mono"
              />
            </div>

            <button
              type="button"
              onClick={addProject}
              className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] rounded-lg text-xs py-1.5 px-3 uppercase tracking-wider font-black transition cursor-pointer"
            >
              + Record Previous Work
            </button>

            {prevProjects.length > 0 && (
              <div className="space-y-1.5 pt-1.5">
                {prevProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-xs bg-[#F5EFEB]/50 border border-[#3E2723]/10 p-2.5 rounded-xl"
                  >
                    <div className="font-bold text-[#3E2723]">
                      {proj.title} <span className="font-mono text-[#D4AF37] font-extrabold ml-1">({proj.year})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProject(idx)}
                      className="text-red-700 hover:text-red-900 transition p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#3E2723]/10 pt-6 flex justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                if (initialProfile) {
                  setIsEditing(false);
                } else {
                  onCancel();
                }
              }}
              className="bg-transparent hover:bg-[#3E2723]/10 border border-[#3E2723]/40 text-[#3E2723] px-6 py-2.5 rounded-xl text-xs uppercase tracking-widest font-black transition cursor-pointer"
            >
              ← Cancel / Skip to Home
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0A192F] hover:bg-[#D4AF37] text-white hover:text-[#0A192F] hover:shadow-[0_0_15px_rgba(212,175,55,0.5)] font-black px-8 py-2.5 rounded-xl text-xs uppercase tracking-widest cursor-pointer transition select-none ml-auto"
            >
              {saving ? "Saving Record..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
