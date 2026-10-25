const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../content/classifier.js");
const { classifyTitle, normalizeTitle } = C;

test("recognizes common study topics", () => {
  for (const title of ["Python Tutorial for Beginners", "Calculus Lecture 4", "Learn English Grammar", "JEE Preparation: Physics"]) {
    assert.equal(classifyTitle(title).category, "study", title);
  }
});

test("blocks obvious entertainment and ambiguous titles", () => {
  assert.equal(classifyTitle("Minecraft Gameplay Highlights").category, "blocked");
  assert.equal(classifyTitle("My weekend at home").category, "unknown");
});

test("blocked terms take precedence over study terms", () => {
  assert.equal(classifyTitle("Python tutorial gameplay challenge").category, "blocked");
});

test("empty titles are unknown", () => {
  assert.equal(classifyTitle(" \n\t ").category, "unknown");
});

test("normalizes case and whitespace", () => {
  assert.equal(normalizeTitle("  PYTHON\n  Tutorial "), "python tutorial");
  assert.equal(classifyTitle("  PYTHON\n  Tutorial ").category, "study");
});

test("default custom subjects are available for the initial chip list", () => {
  C.setCustomKeywords(C.DEFAULT_CUSTOM_KEYWORDS);
  assert.equal(classifyTitle("React JS Full Course").category, "study");
  assert.equal(classifyTitle("React tutorial gameplay challenge").category, "blocked");
  assert.equal(classifyTitle("DSA Course for Placements").category, "study");
  assert.equal(classifyTitle("JavaScript advanced guide").category, "study");
});

test("custom phrases match case-insensitively with whitespace normalization", () => {
  C.setCustomKeywords(["Database Management Systems"]);
  assert.equal(classifyTitle("DATABASE   MANAGEMENT systems overview").category, "study");
});

test("custom subjects use token boundaries instead of matching inside larger words", () => {
  C.setCustomKeywords(["React"]);
  assert.equal(classifyTitle("Reactors weekly update").category, "unknown");
  assert.equal(classifyTitle("React weekly update").category, "study");
});

test("custom keyword validation rejects empty and duplicate values", () => {
  assert.equal(C.addCustomKeyword(["Java"], " \t ").result, "empty");
  assert.equal(C.addCustomKeyword(["Java"], "  JAVA  ").result, "duplicate");
  assert.deepEqual(C.addCustomKeyword(["Java"], "Operating Systems"), {
    result: "added", keywords: ["Java", "Operating Systems"]
  });
});

test("blocked entertainment terms take priority over custom subjects", () => {
  C.setCustomKeywords(["Java"]);
  assert.equal(classifyTitle("Java prank compilation").category, "blocked");
});

test("preview guard classification distinguishes allowed study cards from blocked cards", () => {
  C.setCustomKeywords(["React", "Java"]);
  assert.equal(classifyTitle("Funny Movie Compilation").category, "unknown");
  assert.equal(classifyTitle("React JS Full Course").category, "study");
  assert.equal(classifyTitle("Java prank compilation").category, "blocked");
});

test("removing a custom keyword changes its title to unknown", () => {
  const added = C.addCustomKeyword([], "Database Management Systems");
  C.setCustomKeywords(added.keywords);
  assert.equal(classifyTitle("Database Management Systems overview").category, "study");
  C.setCustomKeywords(C.removeCustomKeyword(added.keywords, "database management systems"));
  assert.equal(classifyTitle("Database Management Systems overview").category, "unknown");
});

test("keyword removal reclassifies with remaining keywords instead of allowing every title", () => {
  const keywords = ["movie", "React"];
  C.setCustomKeywords(keywords);
  assert.equal(classifyTitle("Funny Movie Compilation").category, "study");
  const remaining = C.removeCustomKeyword(keywords, "MOVIE");
  C.setCustomKeywords(remaining);
  assert.deepEqual(remaining, ["React"]);
  assert.equal(classifyTitle("Funny Movie Compilation").category, "unknown");
  assert.equal(classifyTitle("React JS Full Course").category, "study");
  assert.equal(classifyTitle("React tutorial gameplay challenge").category, "blocked");
});

test("unknown titles stay unknown with no custom keywords", () => {
  C.setCustomKeywords([]);
  assert.equal(classifyTitle("My weekend at home").category, "unknown");
});

test.after(() => C.setCustomKeywords(C.DEFAULT_CUSTOM_KEYWORDS));
