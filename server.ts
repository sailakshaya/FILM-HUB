import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for AI Crew Recommender
app.post("/api/recommend", async (req, res) => {
  try {
    const { requirements, profiles } = req.body;

    if (!requirements) {
      return res.status(400).json({ error: "Requirements string is required" });
    }

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.json({ recommendations: [] });
    }

    const prompt = `
You are the SPECIALIZED EXECUTIVE CREW MATCHING PIPELINE for registered Producers and Directors on FILM HUB.
Evaluate the registered professional crew profiles against our strict production requirements and technical standards.
Rank them based on absolute compatibility: matching artistic criteria, specialized equipment familiarity, and critical budget optimization (matching their daily rate (₹ / $)).
Provide a professional score (0 to 100) and an executive commentary in the 'reasoning' field of why they fit the director's visual style or satisfy the producer's line-budget bounds.

Film Production Requirements:
"${requirements}"

Filmaker Profiles in Database:
${JSON.stringify(profiles)}

Perform executive evaluation. Return a JSON array matching the response schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              userId: { type: Type.STRING, description: "The unique identifier of the crew member" },
              name: { type: Type.STRING, description: "Full name" },
              role: { type: Type.STRING, description: "Crew role" },
              matchScore: { type: Type.INTEGER, description: "Match percentage score from 0 to 100" },
              reasoning: { type: Type.STRING, description: "Clear explanation comparing their experience, skills, and rates with requirements" },
              experienceYears: { type: Type.INTEGER, description: "Years of experience" },
              expectedRate: { type: Type.NUMBER, description: "Daily rate expectation" },
              skillsMatched: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of skills that aligned with project requirements",
              },
            },
            required: [
              "userId",
              "name",
              "role",
              "matchScore",
              "reasoning",
              "experienceYears",
              "expectedRate",
              "skillsMatched",
            ],
          },
        },
      },
    });

    const textOutput = response.text?.trim() || "[]";
    const recommendations = JSON.parse(textOutput);

    return res.json({ recommendations });
  } catch (err: any) {
    console.error("AI Recommendation error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API endpoint for AI Project Recommender (for Crew Members)
app.post("/api/recommend-projects", async (req, res) => {
  try {
    const { profile, projects } = req.body;

    if (!profile) {
      return res.status(400).json({ error: "Filmmaker profile is required" });
    }

    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return res.json({ recommendations: [] });
    }

    const prompt = `
You are the SPECIALIZED FILMMAKER CREW EXPECTATION & WAGE PROTECTION PIPELINE for FILM HUB.
We need to match the registered filmmaker crew profile against the ongoing/upcoming film projects.
Rank the projects based on critical, user-focused compatibility criteria:
- Professional rate security (User requires ₹${profile.budgetExpectation}/day (or matching rate unit). Inspect whether the production has the budget to guarantee this rate).
- Production quality of life (evaluate shoot schedules, filming comfort, creative freedom, and geographic distance).
- Artistic compatibility (how well does their specific style and filmography align with the project's visual direction).

Filmmaker Profile:
${JSON.stringify(profile)}

Filming Projects in Database:
${JSON.stringify(projects)}

Perform crew-first compatible evaluation. Return a JSON array matching the response schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              projectId: { type: Type.STRING, description: "The unique identifier of the matched film project" },
              title: { type: Type.STRING, description: "The title of the matched film project" },
              matchScore: { type: Type.INTEGER, description: "Compatibility score from 0 to 100" },
              reasoning: { type: Type.STRING, description: "Explanation of why this project and its producer fits their expected rate, experience level, and artistic role" },
              rateCompatibility: { type: Type.STRING, description: "Evaluation of the budget compatibility (e.g. Within departmental bounds, premium client, etc.)" },
            },
            required: [
              "projectId",
              "title",
              "matchScore",
              "reasoning",
              "rateCompatibility"
            ],
          },
        },
      },
    });

    const textOutput = response.text?.trim() || "[]";
    const recommendations = JSON.parse(textOutput);

    return res.json({ recommendations });
  } catch (err: any) {
    console.error("AI Project Recommendation error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// Serve frontend assets using Vite middleware or static server
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start full stack server:", error);
});
