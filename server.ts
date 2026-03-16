import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  const DATAMUSE_API = "https://api.datamuse.com/words";

  // Rhyme Endpoint
  app.get("/api/rhymes", async (req, res) => {
    try {
      const { word } = req.query;
      if (!word || typeof word !== "string") {
        return res.status(400).json({ error: "Word parameter is required" });
      }

      // Fetch perfect rhymes (rel_rhy) and approximate rhymes (rel_nry)
      const [perfect, approx] = await Promise.all([
        axios.get(`${DATAMUSE_API}?rel_rhy=${word}`),
        axios.get(`${DATAMUSE_API}?rel_nry=${word}`),
      ]);

      // Combine and deduplicate
      const allRhymes = [...perfect.data, ...approx.data];
      // Create a set of words for fast lookup
      const rhymeWords = Array.from(new Set(allRhymes.map((item: any) => item.word.toLowerCase())));

      res.json({ word, rhymes: rhymeWords });
    } catch (error) {
      console.error("Error fetching rhymes:", error);
      res.status(500).json({ error: "Failed to fetch rhymes" });
    }
  });

  // Rhyme Explorer Endpoint
  app.get("/api/rhyme-explorer", async (req, res) => {
    try {
      const { word, mode } = req.query;
      if (!word || typeof word !== "string") {
        return res.status(400).json({ error: "Word parameter is required" });
      }

      const max = 40;
      const md = "s"; // metadata for syllables

      if (mode === "sounds") {
        const [perfect, near, soundAlike, soundAlikeRich, consonant] = await Promise.all([
          axios.get(`${DATAMUSE_API}?rel_rhy=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?rel_nry=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?sl=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?ml=${word}&sl=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?rel_cns=${word}&max=${max}&md=${md}`),
        ]);

        // Merge soundAlike and soundAlikeRich, deduplicate by word
        const soundAlikeMerged = [...soundAlike.data, ...soundAlikeRich.data];
        const seen = new Set();
        const soundAlikeFinal = soundAlikeMerged.filter(item => {
          const lower = item.word.toLowerCase();
          if (seen.has(lower)) return false;
          seen.add(lower);
          return true;
        });

        const mapResult = (data: any[]) => data.map(item => ({
          word: item.word,
          score: item.score,
          numSyllables: item.numSyllables || (item.tags?.find((t: string) => t.startsWith("f:")) ? undefined : undefined) // Datamuse numSyllables is usually direct if md=s
        }));

        res.json({
          mode: "sounds",
          sections: [
            { label: "Perfect rhymes", type: "perfect", results: mapResult(perfect.data) },
            { label: "Near rhymes", type: "near", results: mapResult(near.data) },
            { label: "Sound-alike phrases", type: "sound-alike", results: mapResult(soundAlikeFinal) },
            { label: "Consonant matches", type: "consonant", results: mapResult(consonant.data) },
          ].filter(s => s.results.length > 0)
        });
      } else if (mode === "words") {
        const [synonyms, related, triggers, descriptors] = await Promise.all([
          axios.get(`${DATAMUSE_API}?rel_syn=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?ml=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?rel_trg=${word}&max=${max}&md=${md}`),
          axios.get(`${DATAMUSE_API}?rel_jjb=${word}&max=${max}&md=${md}`),
        ]);

        const mapResult = (data: any[]) => data.map(item => ({
          word: item.word,
          score: item.score,
          numSyllables: item.numSyllables
        }));

        res.json({
          mode: "words",
          sections: [
            { label: "Synonyms", type: "synonyms", results: mapResult(synonyms.data) },
            { label: "Related words", type: "related", results: mapResult(related.data) },
            { label: "Triggers", type: "triggers", results: mapResult(triggers.data) },
            { label: "Descriptors", type: "descriptors", results: mapResult(descriptors.data) },
          ].filter(s => s.results.length > 0)
        });
      } else {
        res.status(400).json({ error: "Invalid mode" });
      }
    } catch (error) {
      console.error("Error in rhyme-explorer:", error);
      res.status(500).json({ error: "Failed to fetch rhyme explorer data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving (basic setup)
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
