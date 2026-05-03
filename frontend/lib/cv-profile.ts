export type CvInsights = {
  keySkills: string[];
  experienceHighlights: string[];
  publications: string[];
  sectionsDetected: string[];
  technicalProjects: string[];
  researchAreas: string[];
  certifications: string[];
  awards: string[];
  languages: string[];
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

const STORAGE_KEY = "embeddify.cvProfile";

const SKILL_KEYWORDS = [
  // Programming Languages
  "python",
  "c++",
  "c#",
  "java",
  "javascript",
  "typescript",
  "sql",
  "r",
  "scala",
  "go",
  "rust",
  "verilog",
  "cuda",
  
  // Data Science & ML
  "machine learning",
  "deep learning",
  "nlp",
  "natural language processing",
  "data science",
  "statistics",
  "statistical analysis",
  "pandas",
  "numpy",
  "scikit-learn",
  "tensorflow",
  "pytorch",
  "keras",
  "xgboost",
  "reinforcement learning",
  
  // Data Engineering & Databases
  "spark",
  "airflow",
  "etl",
  "data pipeline",
  "snowflake",
  "postgresql",
  "mongodb",
  "cassandra",
  "redis",
  "elasticsearch",
  
  // Cloud & DevOps
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "jenkins",
  "gitlab",
  "github",
  "git",
  "gitops",
  "ci/cd",
  
  // Finance & Trading
  "quantitative",
  "quant",
  "trading",
  "options pricing",
  "monte carlo",
  "volatility",
  "garch",
  "lob analytics",
  "market making",
  "equity strategies",
  "currency pair",
  "forex",
  "derivatives",
  "risk management",
  "bloomberg terminal",
  
  // Visualization & BI
  "power bi",
  "tableau",
  "excel",
  "vba",
  "dashboards",
  "visualization",
  "looker",
  "qlik",
  
  // Other Technical
  "graph algorithms",
  "algorithm",
  "optimization",
  "feature engineering",
  "model deployment",
  "api",
  "rest",
  "microservices",
  "scalable",
  
  // Soft Skills
  "research",
  "leadership",
  "project management",
  "communication",
  "collaboration",
  "mentoring",
  "presentation",
  "problem solving",
  "analytical",
  "strategic thinking",
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

export async function buildCvInsights(text: string): Promise<CvInsights> {
  // Use AI to extract insights instead of hardcoded keyword matching
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  
  try {
    const response = await fetch(`${API}/cv/extract-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cv_text: text,
        job_description: "", // Not needed for extraction
      }),
    });

    if (!response.ok) {
      console.warn(`AI extraction returned status ${response.status}, using fallback`);
      return buildCvInsightsFallback(text);
    }

    const insights = await response.json();
    return insights as CvInsights;
  } catch (error) {
    console.warn("AI extraction failed, falling back to basic extraction:", error);
    // Fallback to basic extraction if AI fails
    return buildCvInsightsFallback(text);
  }
}

// Fallback function in case AI extraction fails
function buildCvInsightsFallback(text: string): CvInsights {
  const lowerText = text.toLowerCase();
  const lines = normalizeLines(text);

  // Extract all skills - both from keywords and by looking for common skill patterns
  const foundSkills = new Set<string>();
  
  // Add keyword-based skills
  SKILL_KEYWORDS.forEach((skill) => {
    if (lowerText.includes(skill)) {
      foundSkills.add(titleCase(skill));
    }
  });

  // Look for additional skills in lines that mention "skills" or "technical"
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("skill") || lowerLine.includes("technical") || lowerLine.includes("proficient")) {
      // Extract comma or space-separated items
      const items = line.split(/[,;]/).map(s => s.trim());
      items.forEach((item) => {
        if (item.length > 2 && item.length < 50 && !item.includes("•") && !item.includes("-")) {
          foundSkills.add(item);
        }
      });
    }
  });

  const keySkills = Array.from(foundSkills).slice(0, 25);

  // Extract publications more comprehensively
  const publications = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("publication") ||
      lowerLine.includes("journal") ||
      lowerLine.includes("conference") ||
      lowerLine.includes("doi") ||
      lowerLine.includes("arxiv") ||
      lowerLine.includes("paper") ||
      lowerLine.includes("research") ||
      /^\d{4}\b/.test(line) ||
      /acm|ieee|springer|nature|science/i.test(line)
    );
  }).slice(0, 15);

  // Extract technical projects
  const technicalProjects = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("project") ||
      lowerLine.includes("built") ||
      lowerLine.includes("developed") ||
      lowerLine.includes("implemented") ||
      lowerLine.includes("engineered") ||
      lowerLine.includes("system") ||
      lowerLine.includes("framework") ||
      lowerLine.includes("library") ||
      lowerLine.includes("tool")
    );
  }).slice(0, 15);

  // Extract research areas
  const researchAreas = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("research") ||
      lowerLine.includes("specialization") ||
      lowerLine.includes("focus") ||
      lowerLine.includes("domain") ||
      lowerLine.includes("expertise")
    );
  }).slice(0, 10);

  // Extract certifications
  const certifications = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("certification") ||
      lowerLine.includes("certified") ||
      lowerLine.includes("license") ||
      lowerLine.includes("credential") ||
      lowerLine.includes("aws") ||
      lowerLine.includes("gcp") ||
      lowerLine.includes("azure")
    );
  }).slice(0, 10);

  // Extract awards
  const awards = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      lowerLine.includes("award") ||
      lowerLine.includes("honor") ||
      lowerLine.includes("scholarship") ||
      lowerLine.includes("recognition") ||
      lowerLine.includes("selected") ||
      lowerLine.includes("fellowship") ||
      lowerLine.includes("grant")
    );
  }).slice(0, 10);

  // Extract languages
  const languages = new Set<string>();
  const languageKeywords = ["python", "java", "c++", "javascript", "typescript", "rust", "go", "scala", "r", "sql", "english", "french", "spanish", "german", "mandarin", "japanese"];
  languageKeywords.forEach((lang) => {
    if (lowerText.includes(lang)) {
      languages.add(titleCase(lang));
    }
  });

  // Extract experience highlights more comprehensively
  const experienceHighlights = lines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return (
      /\b(led|managed|built|designed|developed|delivered|optimized|implemented|created|improved|engineered|architected|spearheaded|pioneered|achieved|increased|reduced|accelerated|scaled|launched|directed|oversaw|supervised|mentored|trained|collaborated|contributed|established|founded|launched|transformed|revolutionized|pioneered)\b/.test(lowerLine) ||
      /\b20\d{2}\b/.test(line) ||
      line.startsWith("-") ||
      line.startsWith("•") ||
      /\b(selected|awarded|recognized|promoted|hired|appointed)\b/.test(lowerLine)
    );
  }).slice(0, 20);

  const sectionsDetected = SECTION_KEYWORDS
    .filter(([needle]) => lowerText.includes(needle))
    .map(([, label]) => titleCase(label))
    .filter((label, index, array) => array.indexOf(label) === index);

  return {
    keySkills: keySkills || [],
    experienceHighlights: experienceHighlights || [],
    publications: publications || [],
    technicalProjects: technicalProjects || [],
    researchAreas: researchAreas || [],
    certifications: certifications || [],
    awards: awards || [],
    languages: Array.from(languages) || [],
    sectionsDetected: sectionsDetected || [],
  };
}

export async function makeCvProfile(input: {
  filename: string;
  text: string;
  textPreview?: string;
  textLength?: number;
  pageCount?: number;
}): Promise<CvProfile> {
  const textPreview = input.textPreview ?? input.text.slice(0, 500);

  return {
    filename: input.filename,
    text: input.text,
    textPreview,
    textLength: input.textLength ?? input.text.length,
    pageCount: input.pageCount ?? 1,
    uploadedAt: new Date().toISOString(),
    insights: await buildCvInsights(input.text),
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
  window.dispatchEvent(new Event("embeddify:cv-updated"));
}

export function clearCvProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("embeddify:cv-updated"));
}