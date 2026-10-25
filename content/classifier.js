// Pure, configurable title classifier. A blocked keyword wins on conflicts.
(function (root) {
  "use strict";

  const STUDY_KEYWORDS = Object.freeze([
    "programming", "coding", "javascript", "typescript", "python", "java tutorial", "c++", "rust programming",
    "computer science", "data structures", "algorithms", "software engineering", "web development", "machine learning",
    "artificial intelligence", "math", "mathematics", "algebra", "calculus", "geometry", "statistics", "linear algebra",
    "physics", "chemistry", "biology", "science lecture", "language learning", "learn english", "english lesson",
    "spanish lesson", "grammar lesson", "lecture", "university course", "online course", "tutorial", "how to code",
    "exam preparation", "exam prep", "study guide", "sat prep", "act prep", "jee preparation", "neet preparation",
    "educational", "explained", "lesson", "course"
  ]);

  // Initial chips mirror common subjects. Users can add or remove these in the popup.
  const DEFAULT_CUSTOM_KEYWORDS = Object.freeze(["Java", "DSA", "React", "Node.js", "Python", "System Design"]);
  let customKeywords = [...DEFAULT_CUSTOM_KEYWORDS];

  const BLOCKED_KEYWORDS = [
    "gameplay", "lets play", "let's play", "gaming", "minecraft", "fortnite", "roblox", "reaction", "reacts to",
    "prank", "challenge", "mukbang", "celebrity gossip", "music video", "official video", "movie trailer",
    "funny moments", "comedy sketch", "dance trend", "daily vlog", "unboxing", "speedrun", "highlights"
  ];

  function normalizeTitle(title) {
    return String(title ?? "").normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  }

  function normalizeKeyword(value) {
    return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  }

  function keywordMatches(normalizedTitle, keyword) {
    const normalizedKeyword = normalizeTitle(keyword);
    if (!normalizedKeyword) return false;
    const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(normalizedTitle);
  }

  function setCustomKeywords(keywords) {
    const unique = [];
    const seen = new Set();
    for (const value of Array.isArray(keywords) ? keywords : DEFAULT_CUSTOM_KEYWORDS) {
      const clean = normalizeKeyword(value);
      const key = normalizeTitle(clean);
      if (clean && !seen.has(key)) { seen.add(key); unique.push(clean); }
    }
    customKeywords = unique;
    return [...customKeywords];
  }

  function addCustomKeyword(keywords, value) {
    const clean = normalizeKeyword(value);
    if (!clean) return { result: "empty", keywords: [...keywords] };
    if (keywords.some(item => normalizeTitle(item) === normalizeTitle(clean))) {
      return { result: "duplicate", keywords: [...keywords] };
    }
    return { result: "added", keywords: [...keywords, clean] };
  }

  function removeCustomKeyword(keywords, value) {
    const key = normalizeTitle(value);
    return keywords.filter(item => normalizeTitle(item) !== key);
  }

  function classifyTitle(title) {
    const normalized = normalizeTitle(title);
    if (!normalized) return { category: "unknown", normalized };
    if (BLOCKED_KEYWORDS.some(keyword => keywordMatches(normalized, keyword))) {
      return { category: "blocked", normalized };
    }
    if (STUDY_KEYWORDS.some(keyword => keywordMatches(normalized, keyword)) ||
        customKeywords.some(keyword => keywordMatches(normalized, keyword))) {
      return { category: "study", normalized };
    }
    return { category: "unknown", normalized };
  }

  const api = Object.freeze({ STUDY_KEYWORDS, BLOCKED_KEYWORDS, DEFAULT_CUSTOM_KEYWORDS, normalizeTitle, normalizeKeyword, setCustomKeywords, addCustomKeyword, removeCustomKeyword, classifyTitle });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.StudyGuardClassifier = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
