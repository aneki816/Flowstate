import axios from 'axios';

export interface RhymeData {
  word: string;
  rhymes: string[];
}

export interface RhymeExplorerData {
  mode: "sounds" | "words";
  sections: {
    label: string;
    type: string;
    results: { word: string; score: number; numSyllables?: number }[];
  }[];
}

export const fetchRhymes = async (word: string): Promise<RhymeData> => {
  const response = await axios.get(`/api/rhymes?word=${word}`);
  return response.data;
};

export const fetchRhymeExplorer = async (
  word: string,
  mode: "sounds" | "words"
): Promise<RhymeExplorerData> => {
  const response = await axios.get(`/api/rhyme-explorer?word=${encodeURIComponent(word)}&mode=${mode}`);
  return response.data;
};
