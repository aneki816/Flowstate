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

  // Thesaurus Endpoint
  app.get("/api/thesaurus", async (req, res) => {
    try {
      const { word } = req.query;
      if (!word || typeof word !== "string") {
        return res.status(400).json({ error: "Word parameter is required" });
      }

      // Fetch Synonyms (rel_syn), Means Like (ml), and Adjectives (rel_jjb)
      const [synonyms, meansLike, adjectives] = await Promise.all([
        axios.get(`${DATAMUSE_API}?rel_syn=${word}`),
        axios.get(`${DATAMUSE_API}?ml=${word}`),
        axios.get(`${DATAMUSE_API}?rel_jjb=${word}`),
      ]);

      res.json({
        synonyms: synonyms.data,
        meansLike: meansLike.data,
        adjectives: adjectives.data,
      });
    } catch (error) {
      console.error("Error fetching thesaurus:", error);
      res.status(500).json({ error: "Failed to fetch thesaurus data" });
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
