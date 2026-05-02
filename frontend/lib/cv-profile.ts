export type CvInsights = {
  keySkills: string[];
  experienceHighlights: string[];
  publications: string[];
  sectionsDetected: string[];
};

export type CvProfile = {
  filename: string;
  text: string;
  textPreview: string;
  textLength: number;
  pageCount: number;
  uploadedAt: string;
  insights: CvInsights;
};

const STORAGE_KEY = "cvmatcher.cvProfile";

const SKILL_KEYWORDS = [
  "python",
  "sql",
  "machine learning",
  "deep learning",
  "nlp",
  "data science",
  "statistics",
  "pandas",
  "numpy",
  "scikit-learn",
  "tensorflow",
  "pytorch",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "power bi",
  "tableau",
  "excel",
  "spark",
  "airflow",
  "etl",
  "research",
  "leadership",
  "project management",
  "communication",
  "dashboards",
  "experiment",
  "nlp",
];

const SECTION_KEYWORDS = [
  ["experience", "experience"],
  ["employment", "experience"],
  ["projects", "projects"],
  ["skills", "skills"],
  ["technical skills", "skills"],
  ["education", "education"],
  ["publications", "publications"],
  ["research", "research"],
];

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function titleCase(label: string) {
  return label
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function buildCvInsights(text: string): CvInsights {
  const lowerText = text.toLowerCase();
  const lines = normalizeLines(text);

  const keySkills = SKILL_KEYWORDS.filter((skill) => lowerText.includes(skill)).map(titleCase);

  const publications = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("publication") ||
      lowerLine.includes("journal") ||
      lowerLine.includes("conference") ||
      lowerLine.includes("doi") ||
      lowerLine.includes("arxiv") ||
      /^\d{4}\b/.test(line)
    );
  }).slice(0, 4);

  const experienceHighlights = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      /\b(led|managed|built|designed|developed|delivered|optimized|implemented|created|improved)\b/.test(lowerLine) ||
      /\b20\d{2}\b/.test(line) ||
      line.startsWith("-") ||
      line.startsWith("•")
    );
  }).slice(0, 6);

  const sectionsDetected = SECTION_KEYWORDS
    .filter(([needle]) => lowerText.includes(needle))
    .map(([, label]) => titleCase(label))
    .filter((label, index, array) => array.indexOf(label) === index);

  return {
    keySkills: keySkills.slice(0, 10),
    experienceHighlights,
    publications,
    sectionsDetected,
  };
}

export function makeCvProfile(input: {
  filename: string;
  text: string;
  textPreview?: string;
  textLength?: number;
  pageCount?: number;
}): CvProfile {
  const textPreview = input.textPreview ?? input.text.slice(0, 500);

  return {
    filename: input.filename,
    text: input.text,
    textPreview,
    textLength: input.textLength ?? input.text.length,
    pageCount: input.pageCount ?? 1,
    uploadedAt: new Date().toISOString(),
    insights: buildCvInsights(input.text),
  };
}

export function loadCvProfile(): CvProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CvProfile) : null;
  } catch {
    return null;
  }
}

export function saveCvProfile(profile: CvProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("cvmatcher:cv-updated"));
}

export function clearCvProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("cvmatcher:cv-updated"));
}