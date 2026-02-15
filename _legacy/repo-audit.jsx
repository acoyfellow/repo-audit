import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════
// REPO AUDIT - Open-Source Repository Scoring Tool
// 
// Architecture:
//   1. Fetch repo data directly from GitHub API (no auth needed for public repos)
//   2. Run deterministic scoring engine (80+ signals, 11 categories)
//   3. Optional: AI qualitative pass via Anthropic API
//   4. Cinematic three-act UI: Input → Loading/Scan → Reveal → Results
//
// Outside artifact sandbox: GitHub API works directly
// Inside artifact sandbox: Route through Anthropic API with web_search
// ═══════════════════════════════════════════════════════════════════════

// ── Design Tokens ───────────────────────────────────────────────────────

var C = {
  bg: "#08080a", surface: "#0f0f12", surfaceLight: "#16161b",
  border: "#1e1e25", borderLight: "#2a2a33",
  text: "#e4e4ea", textMuted: "#7a7a88", textDim: "#4a4a55",
  accent: "#00d4aa", accentDim: "#00d4aa30",
  red: "#ff4466", orange: "#ff8844", blue: "#4488ff", gold: "#e8c547",
};

var F = {
  display: "Georgia, 'Times New Roman', serif",
  mono: "Menlo, Consolas, Monaco, 'Courier New', monospace",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
};

// ── Grade System ────────────────────────────────────────────────────────

var GRADES = {
  S: { color: "#00d4aa", label: "Exceptional", min: 8.5 },
  A: { color: "#4488ff", label: "Production-Ready", min: 7.0 },
  B: { color: "#e8c547", label: "Solid Foundation", min: 5.5 },
  C: { color: "#ff8844", label: "Needs Work", min: 4.0 },
  D: { color: "#ff4466", label: "Significant Gaps", min: 2.0 },
  F: { color: "#ff2244", label: "Critical Issues", min: 0 },
};

function getGrade(score) {
  var entries = Object.entries(GRADES);
  for (var i = 0; i < entries.length; i++) {
    if (score >= entries[i][1].min) return { letter: entries[i][0], color: entries[i][1].color, label: entries[i][1].label };
  }
  return { letter: "F", color: "#ff2244", label: "Critical Issues" };
}

// ── Category Definitions (weights sum to 1.00) ─────────────────────────

var CATEGORIES = [
  { key: "firstImpressions", name: "First Impressions", icon: "\u25C6", weight: 0.07 },
  { key: "readme",           name: "README Quality",    icon: "\u25C8", weight: 0.11 },
  { key: "documentation",    name: "Documentation",     icon: "\u25A3", weight: 0.11 },
  { key: "codeQuality",      name: "Code Quality",      icon: "\u2B21", weight: 0.14 },
  { key: "testing",          name: "Testing",           icon: "\u25CE", weight: 0.09 },
  { key: "cicd",             name: "CI/CD",             icon: "\u25C9", weight: 0.07 },
  { key: "security",         name: "Security",          icon: "\u25C7", weight: 0.09 },
  { key: "community",        name: "Community",         icon: "\u2B22", weight: 0.09 },
  { key: "maintenance",      name: "Project Health",    icon: "\u25CB", weight: 0.09 },
  { key: "dx",               name: "Dev Experience",    icon: "\u25A8", weight: 0.09 },
  { key: "licensing",        name: "Licensing",         icon: "\u00A7", weight: 0.05 },
];

function computeTotal(scores) {
  return CATEGORIES.reduce(function(a, c) { return a + (Number(scores[c.key]) || 0) * c.weight; }, 0)
    / CATEGORIES.reduce(function(a, c) { return a + c.weight; }, 0);
}

// ── GitHub API Layer ────────────────────────────────────────────────────

async function ghFetch(url) {
  var res;
  try {
    res = await fetch(url, { headers: { Accept: "application/vnd.github.v3+json" } });
  } catch (e) {
    throw new Error("Network error fetching GitHub API");
  }
  if (res.status === 404) throw new Error("Repository not found. Make sure it exists and is public.");
  if (res.status === 403) throw new Error("GitHub API rate limit. Wait 60s or add a token.");
  if (!res.ok) throw new Error("GitHub API error: " + res.status);
  return res.json();
}

async function fetchGitHubData(owner, repo) {
  var base = "https://api.github.com/repos/" + owner + "/" + repo;

  var meta = await ghFetch(base);

  var settled = await Promise.allSettled([
    ghFetch(base + "/community/profile"),
    ghFetch(base + "/readme"),
    ghFetch(base + "/contents/"),
    ghFetch(base + "/releases?per_page=10"),
    ghFetch(base + "/actions/workflows"),
    ghFetch(base + "/contributors?per_page=30"),
    ghFetch(base + "/commits?per_page=30"),
  ]);

  var v = function(i) { return settled[i].status === "fulfilled" ? settled[i].value : null; };

  var readme = "";
  var readmeObj = v(1);
  if (readmeObj && readmeObj.content) {
    try {
      var clean = readmeObj.content.replace(/[\s\n\r]/g, "");
      readme = decodeURIComponent(escape(atob(clean)));
    } catch (e) {
      try { readme = atob(clean); } catch(e2) { readme = ""; }
    }
  }

  var rootFiles = (v(2) || []).map(function(f) { return (f.name || "").toLowerCase(); });
  var allPaths = rootFiles.slice();
  try {
    var tree = await ghFetch("https://api.github.com/repos/" + owner + "/" + repo + "/git/trees/" + meta.default_branch + "?recursive=1");
    if (tree && tree.tree) allPaths = tree.tree.map(function(t) { return (t.path || "").toLowerCase(); });
  } catch(e) { /* use root only */ }

  return {
    meta: meta,
    community: v(0),
    readme: readme,
    rootFiles: rootFiles,
    allPaths: allPaths,
    releases: v(3) || [],
    workflows: (v(4) || {}).workflows || [],
    contributors: v(5) || [],
    commits: v(6) || [],
  };
}

// ── Deterministic Scoring Engine ────────────────────────────────────────

function scoreRepo(data) {
  var meta = data.meta, community = data.community, readme = data.readme || "",
      rootFiles = data.rootFiles, allPaths = data.allPaths, releases = data.releases,
      workflows = data.workflows, contributors = data.contributors, commits = data.commits;
  var scores = {}, details = {};
  var has = function(pats) { return allPaths.some(function(f) { return pats.some(function(p) { return f.indexOf(p) !== -1; }); }); };
  var hasR = function(pats) { return rootFiles.some(function(f) { return pats.some(function(p) { return f.indexOf(p) !== -1; }); }); };
  var rm = readme.toLowerCase();
  var s, d;

  // 1. First Impressions
  s = 0; d = [];
  if (meta.description && meta.description.length > 10) { s += 2; d.push("Has description"); } else { d.push("Missing or weak description"); }
  if ((meta.topics || []).length >= 3) { s += 2; d.push((meta.topics || []).length + " topics"); } else if ((meta.topics || []).length > 0) { s += 1; d.push("Only " + (meta.topics || []).length + " topic(s)"); } else { d.push("No topics/tags"); }
  if (meta.stargazers_count >= 1000) { s += 2; } else if (meta.stargazers_count >= 100) { s += 1.5; } else if (meta.stargazers_count >= 10) { s += 1; }
  d.push(meta.stargazers_count + " stars, " + meta.forks_count + " forks");
  if (meta.forks_count >= 100) { s += 1; } else if (meta.forks_count >= 10) { s += 0.5; }
  if (meta.homepage) { s += 1.5; d.push("Has homepage link"); } else { d.push("No homepage link"); }
  if (meta.description && meta.description.length > 40) { s += 0.5; }
  scores.firstImpressions = Math.min(10, s); details.firstImpressions = d;

  // 2. README
  s = 0; d = [];
  if (readme.length > 5000) { s += 2; d.push("Comprehensive length"); } else if (readme.length > 1000) { s += 1; d.push("Adequate length"); } else if (readme.length > 200) { s += 0.5; d.push("Brief README"); } else { d.push("No README or very thin"); }
  if (rm.indexOf("install") !== -1 || rm.indexOf("getting started") !== -1 || rm.indexOf("setup") !== -1) { s += 1.5; d.push("Has setup section"); } else { d.push("Missing install instructions"); }
  if (rm.indexOf("usage") !== -1 || rm.indexOf("example") !== -1 || rm.indexOf("how to") !== -1) { s += 1; d.push("Has usage info"); } else { d.push("Missing usage examples"); }
  var cbm = rm.match(/```/g); var cb = cbm ? Math.floor(cbm.length / 2) : 0;
  if (cb >= 3) { s += 1.5; d.push(cb + " code blocks"); } else if (cb >= 1) { s += 0.75; d.push("Has code blocks"); } else { d.push("No code examples"); }
  if (rm.indexOf("shields.io") !== -1 || rm.indexOf("badgen") !== -1 || rm.indexOf("[![") !== -1) { s += 1; d.push("Has badges"); } else { d.push("No badges"); }
  if (rm.indexOf("## ") !== -1 || rm.indexOf("# ") !== -1) { s += 0.5; d.push("Structured headers"); }
  if (rm.indexOf(".gif") !== -1 || rm.indexOf(".png") !== -1 || rm.indexOf(".jpg") !== -1 || rm.indexOf("screenshot") !== -1 || rm.indexOf(".svg") !== -1) { s += 1; d.push("Has visual media"); } else { d.push("No screenshots/demos"); }
  if (rm.indexOf("license") !== -1) { s += 0.5; d.push("References license"); }
  scores.readme = Math.min(10, s); details.readme = d;

  // 3. Documentation
  s = 0; d = [];
  if (has(["docs/", "documentation/"])) { s += 2; d.push("Has docs directory"); } else { d.push("No docs directory"); }
  if (meta.homepage && meta.homepage.indexOf("github.com") === -1) { s += 2; d.push("Has external homepage"); } else { d.push("No dedicated docs site"); }
  if (meta.has_wiki) { s += 0.5; d.push("Wiki enabled"); }
  if (has(["api.md", "api-reference", "openapi", "swagger"])) { s += 1.5; d.push("Has API docs"); }
  if (has(["guide", "tutorial", "cookbook"])) { s += 1.5; d.push("Has guides"); }
  if (has(["changelog", "changes.md"])) { s += 1; d.push("Has changelog"); } else { d.push("No changelog"); }
  if (has(["migration", "upgrade"])) { s += 1; d.push("Migration guide"); }
  scores.documentation = Math.min(10, s); details.documentation = d;

  // 4. Code Quality
  s = 0; d = [];
  if (has(["tsconfig", ".ts", ".tsx"])) { s += 2; d.push("TypeScript"); } else { d.push("No TypeScript"); }
  if (has([".eslintrc", "eslint.config", "biome.json", ".prettierrc", "prettier.config", "deno.json"])) { s += 1.5; d.push("Has linter/formatter"); } else { d.push("No linter config"); }
  if (has([".editorconfig"])) { s += 0.5; d.push(".editorconfig"); }
  var dirs = {}; allPaths.forEach(function(p) { if (p.indexOf("/") !== -1) dirs[p.split("/")[0]] = true; }); var dc = Object.keys(dirs).length;
  if (dc >= 5) { s += 1.5; d.push("Well-organized (" + dc + " dirs)"); } else if (dc >= 3) { s += 1; d.push("Basic structure (" + dc + " dirs)"); } else { d.push("Flat structure"); }
  if (has(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "cargo.lock", "go.sum"])) { s += 1; d.push("Has lockfile"); } else { d.push("No lockfile"); }
  if (meta.language) { s += 0.5; d.push("Language: " + meta.language); }
  if (has(["src/", "lib/", "pkg/"])) { s += 1.5; d.push("Has source directory"); }
  if (has([".env.example", ".env.template", ".dev.vars.example"])) { s += 0.5; d.push("Env template"); }
  scores.codeQuality = Math.min(10, s); details.codeQuality = d;

  // 5. Testing
  s = 0; d = [];
  if (has(["test/", "tests/", "__tests__/", "spec/", "_test.go", ".test.", ".spec."])) { s += 3; d.push("Has test files"); } else { d.push("No tests found"); }
  if (has(["jest.config", "vitest.config", "pytest.ini", "phpunit", ".mocharc"])) { s += 1.5; d.push("Test framework config"); }
  if (has(["cypress/", "playwright", "e2e/"])) { s += 1.5; d.push("E2E tests"); }
  if (has(["codecov", "coveralls", "coverage", ".nycrc"])) { s += 1.5; d.push("Coverage tracking"); } else { d.push("No coverage config"); }
  if (has(["benchmark", "bench/"])) { s += 1; d.push("Benchmarks"); }
  if (has(["fixture", "mock", "__mocks__"])) { s += 0.5; d.push("Test fixtures"); }
  scores.testing = Math.min(10, s); details.testing = d;

  // 6. CI/CD
  s = 0; d = [];
  if (workflows.length > 0) { s += 3; d.push(workflows.length + " GH Actions workflow(s)"); } else if (has([".github/workflows/"])) { s += 2.5; d.push("Has workflow files"); } else if (has([".travis.yml", ".circleci", ".gitlab-ci"])) { s += 2; d.push("Has CI config"); } else { d.push("No CI/CD found"); }
  if (workflows.length >= 3) { s += 1; }
  if (has(["dependabot.yml", "renovate.json"])) { s += 1.5; d.push("Dependency bot"); } else { d.push("No dependency automation"); }
  if (has([".changeset", ".releaserc", "semantic-release"])) { s += 2; d.push("Release automation"); } else if (releases.length > 0) { s += 1; d.push(releases.length + " releases"); } else { d.push("No releases"); }
  if (has(["dockerfile", "docker-compose", ".devcontainer"])) { s += 1; d.push("Containerization"); }
  scores.cicd = Math.min(10, s); details.cicd = d;

  // 7. Security
  s = 0; d = [];
  var cpf = (community && community.files) || {};
  if (cpf.security) { s += 2.5; d.push("SECURITY.md"); } else if (hasR(["security"])) { s += 2; d.push("Security file"); } else { d.push("No SECURITY.md"); }
  if (has(["dependabot.yml", "renovate"])) { s += 1.5; d.push("Dependency scanning"); }
  if (has([".github/codeowners"])) { s += 1; d.push("CODEOWNERS"); }
  if (has([".gitignore"])) { s += 0.5; d.push(".gitignore"); }
  if (has([".env.example", ".dev.vars.example"])) { s += 0.5; d.push("Env templated"); }
  if (has(["snyk", ".trivy"])) { s += 1.5; d.push("Security scanning"); }
  if (meta.allow_forking !== false) { s += 0.5; }
  if (d.length <= 1) { s += 0.5; d.push("Minimal security posture"); }
  scores.security = Math.min(10, s); details.security = d;

  // 8. Community
  s = 0; d = [];
  if (cpf.contributing) { s += 2; d.push("CONTRIBUTING.md"); } else if (hasR(["contributing"])) { s += 1.5; d.push("Contributing file"); } else { d.push("No CONTRIBUTING.md"); }
  if (cpf.code_of_conduct) { s += 1; d.push("Code of Conduct"); } else { d.push("No Code of Conduct"); }
  if (cpf.issue_template || has([".github/issue_template"])) { s += 1.5; d.push("Issue templates"); } else { d.push("No issue templates"); }
  if (cpf.pull_request_template || has(["pull_request_template"])) { s += 1; d.push("PR template"); } else { d.push("No PR template"); }
  if (meta.has_discussions) { s += 1; d.push("Discussions enabled"); }
  if (rm.indexOf("discord") !== -1 || rm.indexOf("slack") !== -1) { s += 0.5; d.push("Community links"); }
  if (contributors.length >= 10) { s += 1.5; d.push(contributors.length + " contributors"); } else if (contributors.length >= 3) { s += 0.75; d.push(contributors.length + " contributors"); } else { d.push("Few contributors"); }
  scores.community = Math.min(10, s); details.community = d;

  // 9. Maintenance
  s = 0; d = [];
  if (commits.length > 0) {
    var days = (Date.now() - new Date(commits[0].commit.author.date).getTime()) / 86400000;
    if (days < 7) { s += 3; d.push("Active this week"); }
    else if (days < 30) { s += 2.5; d.push("Active this month"); }
    else if (days < 90) { s += 1.5; d.push("Active this quarter"); }
    else if (days < 365) { s += 0.5; d.push("Last commit " + Math.floor(days) + "d ago"); }
    else { d.push("Stale: " + Math.floor(days) + " days idle"); }
  } else { d.push("No commit data"); }
  if (releases.length >= 5) { s += 2; d.push(releases.length + " releases"); } else if (releases.length >= 2) { s += 1.5; d.push(releases.length + " releases"); } else if (releases.length === 1) { s += 0.5; d.push("1 release"); } else { d.push("No releases"); }
  if (meta.open_issues_count < 10) { s += 1.5; d.push(meta.open_issues_count + " open issues"); } else if (meta.open_issues_count < 50) { s += 1; d.push(meta.open_issues_count + " issues"); } else { d.push(meta.open_issues_count + " open issues (backlog)"); }
  var bf = contributors.filter(function(c) { return c.contributions > 10; }).length;
  if (bf >= 5) { s += 2; d.push("Strong bus factor (" + bf + ")"); } else if (bf >= 2) { s += 1; d.push("Bus factor: " + bf); } else { s += 0.25; d.push("Low bus factor"); }
  if (commits.length >= 20) { s += 0.5; }
  if (meta.archived) { s = Math.min(s, 2); d.unshift("ARCHIVED"); }
  scores.maintenance = Math.min(10, s); details.maintenance = d;

  // 10. DX
  s = 0; d = [];
  if (has(["changelog"])) { s += 1; d.push("Changelog"); } else { d.push("No changelog"); }
  if (has(["examples/", "example/", "demo/"])) { s += 1.5; d.push("Examples dir"); } else { d.push("No examples dir"); }
  if (has([".devcontainer"])) { s += 1; d.push("Devcontainer"); }
  if (has(["docker-compose", "makefile", "justfile"])) { s += 1; d.push("Dev tooling"); }
  if (has(["playground", "sandbox"])) { s += 0.5; d.push("Playground"); }
  if (rm.indexOf("stackblitz") !== -1 || rm.indexOf("codesandbox") !== -1) { s += 0.5; d.push("Online playground"); }
  if (has(["tsconfig"]) || meta.language === "TypeScript") { s += 1; d.push("Type support"); }
  if (has([".vscode/"])) { s += 0.5; d.push("VS Code config"); }
  if (/npm install|npm i |yarn add|pnpm add|pip install|cargo add|go get|bun add/i.test(readme)) { s += 1.5; d.push("Install cmd in README"); }
  if (has([".env.example", ".dev.vars.example"])) { s += 0.5; d.push("Env template"); }
  if (meta.homepage && meta.homepage.indexOf("github.com") === -1) { s += 0.5; d.push("Live demo"); }
  scores.dx = Math.min(10, s); details.dx = d;

  // 11. Licensing
  s = 0; d = [];
  if (meta.license) {
    s += 4; d.push("License: " + (meta.license.spdx_id || meta.license.name));
    var osi = ["MIT", "Apache-2.0", "GPL-3.0", "GPL-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "MPL-2.0", "Unlicense", "0BSD"];
    if (osi.indexOf(meta.license.spdx_id) !== -1) { s += 3; d.push("OSI-approved"); } else { s += 1; d.push("Non-standard"); }
  } else { d.push("NO LICENSE FILE"); }
  if (hasR(["license"])) { s += 1; }
  if (meta.license && (meta.license.spdx_id === "MIT" || meta.license.spdx_id === "Apache-2.0")) { s += 1; d.push("Business-friendly"); }
  scores.licensing = Math.min(10, s); details.licensing = d;

  return { scores: scores, details: details };
}

// ── AI Enhancement Layer (optional, via Anthropic API) ──────────────────

async function aiEnhance(data, deterministicResult) {
  try {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content:
          "You score open-source repos. Return ONLY valid JSON, no markdown fences.\n" +
          '{"adjustments":{"firstImpressions":0,"readme":0,"documentation":0,"codeQuality":0,"testing":0,"cicd":0,"security":0,"community":0,"maintenance":0,"dx":0,"licensing":0},' +
          '"summary":"One paragraph.","topStrength":"Best thing.","topWeakness":"Biggest gap.","recommendations":["rec1","rec2","rec3"],"redFlags":[]}\n\n' +
          "Each adjustment: float -2 to +2.\nScores: " + JSON.stringify(deterministicResult.scores) + "\n" +
          "Repo: " + data.meta.full_name + "\nDesc: " + (data.meta.description || "none") + "\n" +
          "Stars: " + data.meta.stargazers_count + " Lang: " + data.meta.language + "\n" +
          "Topics: " + ((data.meta.topics || []).join(", ") || "none") + "\n" +
          "Homepage: " + (data.meta.homepage || "none") + "\n\nREADME:\n" + data.readme.substring(0, 4000) +
          "\n\nFiles:\n" + data.allPaths.slice(0, 100).join("\n")
        }],
      }),
    });
    if (!res.ok) return null;
    var json = await res.json();
    var txt = (json.content || []).map(function(c) { return c.text || ""; }).join("");
    return JSON.parse(txt.replace(/```json\s?|```/g, "").trim());
  } catch(e) {
    return null;
  }
}

// ── Fallback: Anthropic API with web_search (for sandbox/restricted envs)

async function analyzeViaAI(owner, repo) {
  var prompt = 'Search for the GitHub repository at: https://github.com/' + owner + '/' + repo + '\n\n' +
    'Look at the repository page, README, file structure, license, stars, forks, issues, workflows, releases, contributors.\n' +
    'Score it across 11 categories (0.0-10.0 each):\n' +
    'firstImpressions, readme, documentation, codeQuality, testing, cicd, security, community, maintenance, dx, licensing\n\n' +
    'For detail items, prefix negatives with "No ", "Missing ", "Few ", "Limited ", "Lacks ".\n\n' +
    'Return ONLY valid JSON:\n' +
    '{"meta":{"full_name":"' + owner + '/' + repo + '","description":"str","stars":0,"forks":0,"open_issues":0,"language":"str","license":"spdx or null","homepage":"url or null","created_year":2024,"archived":false},' +
    '"scores":{"firstImpressions":0,"readme":0,"documentation":0,"codeQuality":0,"testing":0,"cicd":0,"security":0,"community":0,"maintenance":0,"dx":0,"licensing":0},' +
    '"details":{"firstImpressions":["..."],"readme":["..."],"documentation":["..."],"codeQuality":["..."],"testing":["..."],"cicd":["..."],"security":["..."],"community":["..."],"maintenance":["..."],"dx":["..."],"licensing":["..."]},' +
    '"summary":"One paragraph.","topStrength":"str","topWeakness":"str","recommendations":["r1","r2","r3"],"redFlags":[]}';

  var res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error("API error: " + res.status);
  var data = await res.json();
  var textParts = [];
  (data.content || []).forEach(function(b) { if (b.type === "text" && b.text) textParts.push(b.text); });
  var fullText = textParts.join("");
  if (!fullText) throw new Error("No text response from API");
  var cleaned = fullText.replace(/```json\s?|```/g, "").trim();
  var start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in API response");
  var result = JSON.parse(cleaned.substring(start, end + 1));
  if (!result.scores) throw new Error("Response missing scores");
  if (!result.meta) result.meta = { full_name: owner + "/" + repo };
  return result;
}

// ── Main Audit Orchestrator ─────────────────────────────────────────────

async function runAudit(owner, repo, onStatus) {
  // Try direct GitHub API first
  try {
    onStatus("Fetching from GitHub API...");
    var data = await fetchGitHubData(owner, repo);

    onStatus("Running deterministic scoring...");
    var result = scoreRepo(data);

    onStatus("Running AI analysis...");
    var ai = await aiEnhance(data, result);

    // Apply AI adjustments
    var finalScores = Object.assign({}, result.scores);
    if (ai && ai.adjustments) {
      Object.entries(ai.adjustments).forEach(function(entry) {
        if (finalScores[entry[0]] != null && typeof entry[1] === "number") {
          finalScores[entry[0]] = Math.max(0, Math.min(10, finalScores[entry[0]] + entry[1]));
        }
      });
    }

    return {
      meta: {
        full_name: data.meta.full_name,
        description: data.meta.description,
        stars: data.meta.stargazers_count,
        forks: data.meta.forks_count,
        open_issues: data.meta.open_issues_count,
        language: data.meta.language,
        license: data.meta.license ? data.meta.license.spdx_id : null,
        homepage: data.meta.homepage,
        created_year: data.meta.created_at ? new Date(data.meta.created_at).getFullYear() : null,
        archived: data.meta.archived,
      },
      scores: finalScores,
      details: result.details,
      summary: ai ? ai.summary : null,
      topStrength: ai ? ai.topStrength : null,
      topWeakness: ai ? ai.topWeakness : null,
      recommendations: ai ? ai.recommendations : [],
      redFlags: ai ? (ai.redFlags || []) : [],
    };
  } catch(e) {
    // GitHub API failed (probably sandbox) - fall back to AI-only
    onStatus("GitHub API unavailable, using AI search...");
    return await analyzeViaAI(owner, repo);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function isNeg(t) { return /^(no |missing|stale|few |flat |low |minimal |none|archived|thin|weak|brief |lacks|limited|absent)/i.test((t || "").trim()); }

function AnimNum(props) {
  var value = props.value, dur = props.dur || 1400;
  var raf = useRef(null), t0 = useRef(null), mounted = useRef(true);
  var _s = useState(0), n = _s[0], setN = _s[1];
  useEffect(function() {
    mounted.current = true; t0.current = null;
    function step(ts) {
      if (!mounted.current) return;
      if (!t0.current) t0.current = ts;
      var p = Math.min((ts - t0.current) / dur, 1);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
    }
    raf.current = requestAnimationFrame(step);
    return function() { mounted.current = false; cancelAnimationFrame(raf.current); };
  }, [value, dur]);
  return n.toFixed(1);
}

function Ring(props) {
  var score = props.score, size = props.size || 64, sw = props.sw || 2.5, delay = props.delay || 0;
  var _s = useState(false), on = _s[0], setOn = _s[1];
  var g = getGrade(score);
  var r = (size - sw * 2) / 2, c = 2 * Math.PI * r;
  useEffect(function() { var t = setTimeout(function() { setOn(true); }, delay); return function() { clearTimeout(t); }; }, [delay]);
  return (
    <div style={{ position: "relative", width: size, height: size, opacity: on ? 1 : 0, transition: "opacity .5s" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={g.color} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={on ? c - (score/10)*c : c}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1) " + delay + "ms", filter: "drop-shadow(0 0 4px " + g.color + "50)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: F.display, fontSize: size * .3, fontWeight: 700, color: g.color }}>
          {on ? <AnimNum value={score} /> : "0.0"}
        </span>
      </div>
    </div>
  );
}

// ── Input Screen ────────────────────────────────────────────────────────

function InputScreen(props) {
  var onSubmit = props.onSubmit, error = props.error, loading = props.loading;
  var _u = useState(""), url = _u[0], setUrl = _u[1];
  var _e = useState(""), err = _e[0], setErr = _e[1];
  var _f = useState(false), focused = _f[0], setFocused = _f[1];
  var ref = useRef(null);
  useEffect(function() { setTimeout(function() { if (ref.current) ref.current.focus(); }, 400); }, []);

  function go() {
    var m = url.trim().replace(/\/$/, "").match(/(?:(?:https?:\/\/)?github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!m) { setErr("Enter owner/repo or a GitHub URL"); return; }
    setErr(""); onSubmit(m[1], m[2].replace(/\.git$/, ""));
  }
  function quick(r) { var p = r.split("/"); onSubmit(p[0], p[1]); }
  var e = err || error;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 540, width: "100%", animation: "fu .8s cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ fontFamily: F.display, fontSize: "clamp(34px,6vw,56px)", fontWeight: 400, color: C.text, letterSpacing: "-.02em", textAlign: "center", lineHeight: 1.1, marginBottom: 6 }}>
          Repository <span style={{ fontWeight: 700, fontStyle: "italic", color: C.accent }}>Audit</span>
        </div>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textMuted, textAlign: "center", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 38 }}>
          AI-powered open-source scoring
        </p>
        <div style={{
          position: "relative", border: "1px solid " + (focused ? C.accent + "50" : C.border), borderRadius: 12,
          background: C.surface, transition: "border-color .3s, box-shadow .3s",
          boxShadow: focused ? "0 0 0 1px " + C.accent + "15, 0 0 24px " + C.accent + "06" : "none",
          opacity: loading ? 0.5 : 1, pointerEvents: loading ? "none" : "auto",
        }}>
          <input ref={ref} value={url} onChange={function(ev) { setUrl(ev.target.value); setErr(""); }}
            onFocus={function() { setFocused(true); }} onBlur={function() { setFocused(false); }}
            onKeyDown={function(ev) { if (ev.key === "Enter") go(); }}
            placeholder="owner/repo or github.com/owner/repo"
            style={{ width: "100%", padding: "16px 110px 16px 16px", fontSize: 14, fontFamily: F.mono, background: "transparent", border: "none", outline: "none", color: C.text, boxSizing: "border-box" }}
          />
          <button onClick={go} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", padding: "8px 18px", fontFamily: F.body, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", background: C.accent, color: C.bg, border: "none", borderRadius: 8, cursor: "pointer" }}>AUDIT</button>
        </div>
        {e && <p style={{ fontFamily: F.body, fontSize: 13, color: C.red, marginTop: 12, textAlign: "center" }}>{e}</p>}
        <div style={{ marginTop: 36, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", animation: "fu .8s .2s cubic-bezier(.16,1,.3,1) both", opacity: loading ? 0.3 : 1, pointerEvents: loading ? "none" : "auto" }}>
          {["acoyfellow/tax-agent", "sveltejs/svelte", "astral-sh/ruff"].map(function(r) {
            return <button key={r} onClick={function() { quick(r); }} style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "5px 12px", cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={function(ev) { ev.currentTarget.style.borderColor = C.accent + "40"; ev.currentTarget.style.color = C.textMuted; }}
              onMouseLeave={function(ev) { ev.currentTarget.style.borderColor = C.border; ev.currentTarget.style.color = C.textDim; }}
            >{r}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Loading Screen ──────────────────────────────────────────────────────

function LoadingScreen(props) {
  var _d = useState(0), dots = _d[0], setDots = _d[1];
  useEffect(function() { var i = setInterval(function() { setDots(function(d) { return (d + 1) % 4; }); }, 500); return function() { clearInterval(i); }; }, []);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: F.display, fontSize: 26, fontWeight: 400, color: C.text, marginBottom: 8 }}>Analyzing</div>
        <div style={{ fontFamily: F.mono, fontSize: 13, color: C.accent, marginBottom: 32 }}>{props.name}</div>
        <div style={{ width: "100%", height: 2, background: C.border, borderRadius: 1, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ height: "100%", background: C.accent, borderRadius: 1, animation: "loading 2s ease-in-out infinite", boxShadow: "0 0 8px " + C.accent + "80" }} />
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim }}>{props.status || ("Scoring" + ".".repeat(dots))}</div>
      </div>
    </div>
  );
}

// ── Reveal Screen ───────────────────────────────────────────────────────

function RevealScreen(props) {
  var score = props.score, grade = props.grade, name = props.name, onContinue = props.onContinue;
  var _p = useState(0), ph = _p[0], setPh = _p[1];
  useEffect(function() {
    var t = [setTimeout(function(){setPh(1);},300), setTimeout(function(){setPh(2);},1600), setTimeout(function(){setPh(3);},2400), setTimeout(function(){setPh(4);},3200)];
    return function() { t.forEach(clearTimeout); };
  }, []);
  return (
    <div onClick={function(){if(ph>=4)onContinue();}} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, cursor: ph >= 4 ? "pointer" : "default", position: "relative", zIndex: 1 }}>
      <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle," + grade.color + "0d 0%,transparent 70%)", opacity: ph >= 1 ? 1 : 0, transition: "opacity 1.5s", pointerEvents: "none" }} />
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 22, opacity: ph >= 1 ? 1 : 0, transform: ph >= 1 ? "none" : "translateY(8px)", transition: "all .8s cubic-bezier(.16,1,.3,1)" }}>{name}</div>
      <div style={{ fontFamily: F.display, fontWeight: 400, fontSize: "clamp(64px,14vw,130px)", lineHeight: 1, color: grade.color, opacity: ph >= 1 ? 1 : 0, transform: ph >= 1 ? "scale(1)" : "scale(.85)", transition: "all 1s cubic-bezier(.16,1,.3,1)", textShadow: "0 0 40px " + grade.color + "20" }}>
        {ph >= 1 ? <AnimNum value={score} dur={1200} /> : "0.0"}
      </div>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: "clamp(24px,5vw,40px)", color: grade.color, letterSpacing: ".08em", marginTop: 4, opacity: ph >= 2 ? 1 : 0, transform: ph >= 2 ? "none" : "translateY(12px)", transition: "all .8s cubic-bezier(.16,1,.3,1)" }}>{grade.letter}</div>
      <div style={{ fontFamily: F.body, fontSize: 14, color: C.textMuted, marginTop: 4, opacity: ph >= 3 ? 1 : 0, transform: ph >= 3 ? "none" : "translateY(6px)", transition: "all .8s cubic-bezier(.16,1,.3,1)" }}>{grade.label}</div>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: C.textDim, marginTop: 48, opacity: ph >= 4 ? 1 : 0, animation: ph >= 4 ? "pulse 2.5s ease infinite" : "none" }}>TAP TO CONTINUE</div>
    </div>
  );
}

// ── Results Screen ──────────────────────────────────────────────────────

function ResultsScreen(props) {
  var result = props.result, onReset = props.onReset;
  var _v = useState(false), vis = _v[0], setVis = _v[1];
  useEffect(function() { setTimeout(function() { setVis(true); }, 60); }, []);
  var scores = result.scores || {}, details = result.details || {}, meta = result.meta || {};
  var total = computeTotal(scores), grade = getGrade(total);
  var flags = result.redFlags || [];

  return (
    <div style={{ minHeight: "100vh", padding: "32px 16px", position: "relative", zIndex: 1, opacity: vis ? 1 : 0, transition: "opacity .5s" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textDim, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 2 }}>AUDIT COMPLETE</div>
            <a href={"https://github.com/" + (meta.full_name || "")} target="_blank" rel="noopener noreferrer" style={{ fontFamily: F.display, fontSize: 24, fontWeight: 500, color: C.text, textDecoration: "none" }}>{meta.full_name}</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Ring score={total} size={60} delay={200} />
            <div style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, color: grade.color }}>{grade.letter}</div>
          </div>
        </div>

        {result.summary && (
          <div style={{ padding: 16, borderRadius: 10, background: C.surface, border: "1px solid " + C.border, marginBottom: 16, animation: "fu .5s .1s cubic-bezier(.16,1,.3,1) both" }}>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.text, lineHeight: 1.6, margin: 0 }}>{result.summary}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              {result.topStrength && <div style={{ flex: "1 1 170px" }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.accent, letterSpacing: ".05em", marginBottom: 2 }}>STRENGTH</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{result.topStrength}</div>
              </div>}
              {result.topWeakness && <div style={{ flex: "1 1 170px" }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.orange, letterSpacing: ".05em", marginBottom: 2 }}>WEAKNESS</div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{result.topWeakness}</div>
              </div>}
            </div>
          </div>
        )}

        {flags.length > 0 && (
          <div style={{ padding: 10, borderRadius: 8, background: C.red + "06", border: "1px solid " + C.red + "15", marginBottom: 16 }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.red, letterSpacing: ".05em", marginBottom: 3 }}>RED FLAGS</div>
            {flags.map(function(f, i) { return <div key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.red + "bb" }}>{f}</div>; })}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {CATEGORIES.map(function(cat, ci) {
            var sc = Number(scores[cat.key]) || 0, g = getGrade(sc), dd = details[cat.key] || [];
            return (
              <div key={cat.key} style={{ padding: "12px 13px", borderRadius: 8, background: C.surface, border: "1px solid " + C.border, animation: "fu .3s " + (ci * .05) + "s cubic-bezier(.16,1,.3,1) both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: g.color, width: 15, textAlign: "center" }}>{cat.icon}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.text, flex: 1 }}>{cat.name}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textDim }}>{Math.round(cat.weight * 100)}%</span>
                  <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 600, color: g.color, minWidth: 30, textAlign: "right" }}>{sc.toFixed(1)}</span>
                </div>
                <div style={{ margin: "6px 0 4px 24px", height: 2, background: C.border, borderRadius: 1, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (sc * 10) + "%", background: g.color, borderRadius: 1, transition: "width .8s cubic-bezier(.16,1,.3,1)", boxShadow: "0 0 4px " + g.color + "30" }} />
                </div>
                <div style={{ marginLeft: 24, display: "flex", flexWrap: "wrap", gap: "1px 8px" }}>
                  {dd.map(function(t, i) {
                    var neg = isNeg(t);
                    return <span key={i} style={{ fontFamily: F.mono, fontSize: 10, color: C.textDim }}>
                      <span style={{ color: neg ? C.red + "70" : C.accent + "70", marginRight: 3 }}>{neg ? "\u2212" : "+"}</span>{t}
                    </span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {result.recommendations && result.recommendations.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: C.surface, border: "1px solid " + C.accent + "12", animation: "fu .3s .7s cubic-bezier(.16,1,.3,1) both" }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.accent, letterSpacing: ".05em", marginBottom: 7 }}>RECOMMENDATIONS</div>
            {result.recommendations.map(function(r, i) {
              return <div key={i} style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, lineHeight: 1.4, padding: "3px 0", borderTop: i ? "1px solid " + C.border : "none", display: "flex", gap: 6 }}>
                <span style={{ color: C.accent, fontFamily: F.mono, fontSize: 10, marginTop: 1, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>{r}
              </div>;
            })}
          </div>
        )}

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 2, animation: "fu .3s .5s cubic-bezier(.16,1,.3,1) both" }}>
          {[
            { l: "Stars", v: String(meta.stars != null ? meta.stars : "?") },
            { l: "Forks", v: String(meta.forks != null ? meta.forks : "?") },
            { l: "Issues", v: String(meta.open_issues != null ? meta.open_issues : "?") },
            { l: "Language", v: meta.language || "N/A" },
            { l: "License", v: meta.license || "None" },
            { l: "Created", v: meta.created_year ? String(meta.created_year) : "?" },
          ].map(function(x) {
            return <div key={x.l} style={{ padding: "9px 10px", background: C.surface, borderRadius: 6, border: "1px solid " + C.border }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textDim, letterSpacing: ".04em", marginBottom: 1 }}>{x.l}</div>
              <div style={{ fontFamily: F.mono, fontSize: 12, color: C.text, fontWeight: 500 }}>{x.v}</div>
            </div>;
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 32, paddingBottom: 32 }}>
          <button onClick={onReset} style={{ fontFamily: F.body, fontSize: 12, color: C.textMuted, background: "none", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 20px", cursor: "pointer", transition: "all .2s" }}
            onMouseEnter={function(ev) { ev.currentTarget.style.borderColor = C.accent + "40"; ev.currentTarget.style.color = C.text; }}
            onMouseLeave={function(ev) { ev.currentTarget.style.borderColor = C.border; ev.currentTarget.style.color = C.textMuted; }}
          >Audit Another</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  var _scr = useState("input"), screen = _scr[0], setScreen = _scr[1];
  var _res = useState(null), result = _res[0], setResult = _res[1];
  var _err = useState(""), error = _err[0], setError = _err[1];
  var _name = useState(""), repoName = _name[0], setRepoName = _name[1];
  var _status = useState(""), status = _status[0], setStatus = _status[1];
  var _loading = useState(false), loading = _loading[0], setLoading = _loading[1];

  var audit = useCallback(async function(owner, name) {
    setError(""); setResult(null); setRepoName(owner + "/" + name);
    setLoading(true); setScreen("loading"); setStatus("");

    try {
      var data = await runAudit(owner, name, setStatus);
      setResult(data);
      setLoading(false);
      setScreen("reveal");
    } catch(err) {
      setError(err.message || "Something went wrong");
      setLoading(false);
      setScreen("input");
    }
  }, []);

  var scores = result ? result.scores || {} : {};
  var total = computeTotal(scores);
  var grade = getGrade(total || 0);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <style>{
        "*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }" +
        "html, body { background:" + C.bg + "; }" +
        "::selection { background:" + C.accent + "20; }" +
        "input::placeholder { color:" + C.textDim + "; }" +
        "@keyframes fu { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }" +
        "@keyframes pulse { 0%,100%{opacity:.3;} 50%{opacity:1;} }" +
        "@keyframes loading { 0%{width:5%;margin-left:0;} 50%{width:40%;margin-left:30%;} 100%{width:5%;margin-left:95%;} }"
      }</style>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: .02, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      {screen === "input" && <InputScreen onSubmit={audit} error={error} loading={loading} />}
      {screen === "loading" && <LoadingScreen name={repoName} status={status} />}
      {screen === "reveal" && result && <RevealScreen score={total} grade={grade} name={result.meta ? result.meta.full_name : repoName} onContinue={function() { setScreen("results"); }} />}
      {screen === "results" && result && <ResultsScreen result={result} onReset={function() { setScreen("input"); setResult(null); setError(""); }} />}
    </div>
  );
}
