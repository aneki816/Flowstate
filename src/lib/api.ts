import axios from 'axios';

export interface RhymeData {
  word: string;
  rhymes: string[];
}

export interface ThesaurusData {
  synonyms: DatamuseResult[];
  meansLike: DatamuseResult[];
  adjectives: DatamuseResult[];
}

export interface DatamuseResult {
  word: string;
  score: number;
  tags?: string[];
}

export const fetchRhymes = async (word: string): Promise<RhymeData> => {
  const response = await axios.get(`/api/rhymes?word=${word}`);
  return response.data;
};

export const fetchThesaurus = async (word: string): Promise<ThesaurusData> => {
  const response = await axios.get(`/api/thesaurus?word=${word}`);
  return response.data;
};
