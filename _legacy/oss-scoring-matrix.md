# Open-Source Repository Scoring Matrix

A comprehensive framework for evaluating the quality, health, and maturity of an open-source repository. Each category is scored 0-10, with weighted importance reflecting modern (2025) expectations.

---

## 1. First Impressions & Discoverability (Weight: 8%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Repository name** | Cryptic, unclear purpose | Somewhat descriptive | Immediately conveys purpose, memorable |
| **Description / tagline** | Missing or vague | Present but generic | Concise, compelling, includes key differentiators |
| **Topics / tags** | None | A few relevant tags | Well-chosen tags covering language, domain, and use case |
| **Social proof signals** | < 10 stars, no forks | Moderate engagement | Strong star count, forks, used-by count, sponsor badges |
| **Logo / branding** | None | Basic icon | Professional logo, consistent visual identity |

---

## 2. README Quality (Weight: 12%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Hero section** | No overview, jumps into details | Basic description | Clear value prop, badge row (build, coverage, version, license), optional banner image |
| **Quick start / installation** | Missing or broken | Present but incomplete | Copy-paste ready, multiple package managers, verified working |
| **Usage examples** | None | One basic example | Progressive examples (basic to advanced), real-world scenarios |
| **Feature overview** | Not listed | Bullet list of features | Feature matrix with status indicators, comparison to alternatives |
| **Architecture overview** | None | Brief mention | Diagrams (Mermaid or images), clear explanation of how it works under the hood |
| **Table of contents** | Missing on long READMEs | Present | Auto-generated, well-organized sections |
| **Badges** | None | 1-2 badges | Build status, coverage, version, downloads, license, Discord/community link |
| **Demo / screenshots** | None | Static screenshot | GIF/video demo, live playground link, interactive examples |
| **"Why this over X?"** | No positioning | Brief mention | Honest comparison table with alternatives, clear differentiation |

---

## 3. Documentation (Weight: 12%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Docs site** | README only | GitHub wiki or basic docs folder | Dedicated docs site (Docusaurus, Starlight, VitePress, etc.) with search |
| **API reference** | None | Partial or auto-generated only | Complete, auto-generated from source with hand-written guides layered on top |
| **Tutorials / guides** | None | One getting-started guide | Progressive learning path: quickstart, guides, deep dives, cookbook/recipes |
| **Conceptual docs** | None | Brief | Explains mental models, architecture decisions, and "why" behind design choices |
| **Migration guides** | None | Changelog mentions breaking changes | Dedicated migration guides per major version with codemods where applicable |
| **Search** | None | Basic | Full-text search with good relevance ranking |
| **Versioned docs** | None | Latest only | Docs versioned per release, easy switching between versions |
| **i18n** | English only (acceptable for most) | Partial translations | Community-driven translations with clear contribution process |

---

## 4. Code Quality & Architecture (Weight: 15%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Code organization** | Flat file dump, no clear structure | Basic folder structure | Clear module boundaries, consistent naming conventions, logical separation |
| **Type safety** | No types, any-heavy | Partial typing | Full type coverage, exported types for consumers, strict mode |
| **Linting & formatting** | None | Linter present but inconsistent | Enforced via CI (ESLint/Biome/Clippy/etc.), consistent style, no warnings |
| **Error handling** | Silent failures, bare throws | Try-catch with generic errors | Typed errors, error codes, actionable error messages, recovery paths |
| **Dependency hygiene** | Bloated deps, outdated, abandoned packages | Reasonable deps | Minimal deps, well-maintained deps, lockfile present, dependency policy documented |
| **Bundle size / footprint** | No consideration | Reasonable but not optimized | Tree-shakeable, documented size, size-limit CI checks |
| **Abstraction quality** | Leaky abstractions, god files | Decent separation | Clean interfaces, single responsibility, composable design, escape hatches |
| **Configuration** | Hardcoded values | Basic config support | Layered config (defaults, env, file, runtime), validated, well-documented options |
| **Backward compatibility** | Breaks frequently without notice | Semver mostly followed | Strict semver, deprecation warnings before removal, codemods for migrations |

---

## 5. Testing (Weight: 10%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Unit tests** | None or trivial | Core paths covered | Comprehensive coverage including edge cases, readable test names |
| **Integration tests** | None | Basic happy paths | Tests against real dependencies (databases, APIs) or high-fidelity mocks |
| **E2E tests** | None | Minimal | Critical user flows covered, runs in CI, cross-browser/platform |
| **Coverage tracking** | None | Coverage report exists | Coverage gates in CI, trend tracking, meaningful thresholds (not vanity 100%) |
| **Test quality** | Tests that test nothing, brittle mocks | Decent assertions | Tests document behavior, test titles read as specs, minimal mocking |
| **Snapshot / visual regression** | None | Basic snapshots | Visual regression testing for UI components, reviewed snapshots |
| **Performance / benchmark tests** | None | Basic benchmarks | Regression benchmarks in CI, comparison against alternatives published |
| **Fuzz / property testing** | None | None (acceptable for most) | Property-based or fuzz testing for parser/serialization/security-critical code |

---

## 6. CI/CD & Automation (Weight: 8%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **CI pipeline** | None | Basic test run on push | Multi-stage: lint, type-check, test, build, size check, security scan |
| **CI speed** | > 20 min | 5-20 min | < 5 min with caching, parallelization, incremental checks |
| **PR checks** | None | Tests must pass | Required checks: tests, lint, type-check, size, changelog entry, preview deploy |
| **Release automation** | Manual copy-paste | Semi-automated | Fully automated: changesets/conventional commits, auto-changelog, auto-publish |
| **Multi-platform CI** | Single OS | Primary OS + one other | Matrix testing across OS, runtime versions, and dependency versions |
| **Bot automation** | None | Dependabot/Renovate | Dependency updates, stale issue management, auto-labeling, auto-merge for deps |
| **Preview deployments** | None | None (acceptable) | PR preview deployments for docs/demo sites |

---

## 7. Security (Weight: 10%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **SECURITY.md** | None | Basic contact info | Clear vulnerability reporting process, response time SLA, scope definition |
| **Dependency scanning** | None | Dependabot alerts enabled | Automated scanning (Snyk, Trivy, etc.) in CI, blocking on critical/high |
| **Supply chain** | No protections | Lockfile present | Signed commits, provenance attestation, SLSA compliance, minimal install scripts |
| **Secret management** | Secrets in code (critical fail) | No secrets in code | Secret scanning enabled, documented practices, rotate-on-leak procedures |
| **Audit history** | None | None (acceptable for small projects) | Third-party audits for security-critical code, published reports |
| **Permission model** | Overly permissive | Reasonable | Principle of least privilege, documented permissions, scoped tokens |
| **CVE response** | No track record | Slow patches | Fast response, advisories published, backported fixes to supported versions |

---

## 8. Community & Governance (Weight: 10%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **CONTRIBUTING.md** | None | Basic "PRs welcome" | Detailed guide: setup, workflow, testing, commit conventions, PR process |
| **Code of conduct** | None | Template CoC, not enforced | Adopted CoC with clear enforcement process and named enforcers |
| **Issue templates** | None | Basic template | Separate templates for bugs, features, questions with required fields |
| **PR template** | None | Basic checklist | Checklist covering tests, docs, breaking changes, linked issues |
| **Discussion forums** | None | GitHub Issues used for everything | GitHub Discussions, Discord/Slack, clear separation of support vs. bugs vs. features |
| **Governance model** | Single maintainer, no process | Informal collaboration | Documented governance (BDFL, committee, RFC process), clear decision-making |
| **Contributor recognition** | None | Contributors listed in README | All-contributors bot, release notes credit, contributor spotlight |
| **Roadmap** | None | Vague mentions in issues | Public roadmap (GitHub Projects, dedicated page), community input process |
| **Responsiveness** | Issues/PRs ignored for months | Weeks for response | Median first response < 48h, clear SLA expectations set |

---

## 9. Maintenance & Project Health (Weight: 10%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Commit frequency** | Dead for 6+ months | Sporadic bursts | Regular commits, consistent cadence (doesn't need to be daily) |
| **Release cadence** | No releases or years between | Irregular releases | Predictable release schedule, clear versioning, LTS policy for mature projects |
| **Issue triage** | Hundreds of untriaged issues | Some labeling | Active triage, labeled, prioritized, stale issues managed |
| **PR review turnaround** | PRs rot for months | Weeks | Days for first review, clear feedback, mentoring tone for new contributors |
| **Bus factor** | Single maintainer, no succession plan | 2-3 active contributors | Multiple maintainers across organizations, documented succession/transition plan |
| **Funding / sustainability** | No funding model | GitHub Sponsors or similar | Sustainable funding (corporate sponsors, foundation, Open Collective), transparent finances |
| **Deprecation communication** | Breaking changes without notice | Changelog mentions | Deprecation warnings in code + docs, migration path, reasonable sunset timeline |
| **Backward support** | Only latest version | One prior major version | Defined support policy, security backports to supported versions |

---

## 10. Developer Experience (DX) (Weight: 10%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **Time to first working example** | Hours of config, dependency hell | 15-30 min | < 5 min from clone to working example, or instant via playground |
| **Error messages** | Cryptic stack traces | Readable errors | Actionable messages with fix suggestions, links to relevant docs |
| **IDE support** | No types, no intellisense | Basic types | Full type inference, JSDoc/docstrings, IDE plugin if applicable |
| **Debug experience** | console.log only | Basic debug support | Source maps, debug mode with verbose logging, named objects in devtools |
| **Local dev setup** | Undocumented, fragile | Documented manual setup | One-command setup (devcontainer, docker-compose, Nix flake, Makefile) |
| **Playground / REPL** | None | None (acceptable) | Online playground, Stackblitz/CodeSandbox template, REPL |
| **Changelog** | None or auto-generated noise | Maintained CHANGELOG.md | Well-written, categorized (breaking, features, fixes), linked to PRs/issues |
| **Escape hatches** | Locked in, no extensibility | Plugin system or hooks | Well-documented extension points, middleware/plugin API, raw access when needed |

---

## 11. Licensing & Legal (Weight: 5%)

| Criteria | 0-3 (Poor) | 4-6 (Adequate) | 7-10 (Excellent) |
|---|---|---|---|
| **LICENSE file** | Missing (critical fail) | Present | Present, standard OSI-approved license, SPDX identifier in package manifest |
| **License clarity** | Ambiguous, custom license | Standard but potentially confusing (dual license) | Clear single license, FAQ addressing common questions |
| **CLA / DCO** | No contributor agreement | Informal | Clear CLA or DCO process, automated (CLA bot or DCO sign-off) |
| **License compatibility** | Dependencies with incompatible licenses | Mostly compatible | Audited dependency licenses, SBOM generation, all compatible |
| **Commercial use clarity** | Unclear if commercial use is allowed | License technically allows it | Explicitly stated, no rug-pull risk (see recent BSL/SSPL drama) |

---

## Scoring Summary Template

| Category | Weight | Score (0-10) | Weighted Score |
|---|---|---|---|
| First Impressions & Discoverability | 8% | | |
| README Quality | 12% | | |
| Documentation | 12% | | |
| Code Quality & Architecture | 15% | | |
| Testing | 10% | | |
| CI/CD & Automation | 8% | | |
| Security | 10% | | |
| Community & Governance | 10% | | |
| Maintenance & Project Health | 10% | | |
| Developer Experience (DX) | 10% | | |
| Licensing & Legal | 5% | | |
| **Total** | **100%** | | **/10** |

---

## Scoring Guide

- **9-10**: Best-in-class. Reference implementation others should study.
- **7-8**: Production-ready. Trustworthy for critical infrastructure.
- **5-6**: Usable with caveats. Acceptable for non-critical use, shows investment.
- **3-4**: Risky. Significant gaps that create real costs for adopters.
- **0-2**: Avoid or fork. Fundamental issues that signal abandonment or carelessness.

---

## Context-Dependent Adjustments

Not every repo needs a 10 in every category. Apply these modifiers:

- **Solo hobby project**: Relax governance, community, and release cadence expectations. Weight code quality and README higher.
- **Critical infrastructure / security tooling**: Weight security, testing, and maintenance much higher. Expect audits and formal processes.
- **Developer tool / library**: Weight DX, documentation, and bundle size higher. Time-to-first-example is king.
- **Framework**: Weight architecture, backward compatibility, migration guides, and ecosystem/plugin support higher.
- **Data / ML project**: Add criteria for reproducibility, dataset documentation, model cards, and compute requirements.
- **Early-stage / pre-1.0**: Accept lower scores on governance and release cadence, but README and quick start should still be strong.

---

## Red Flags (Automatic Deductions)

These are signals that should raise immediate concern regardless of other scores:

1. **No license file** - legally unusable
2. **Secrets committed to repo history** - security failure
3. **No tests at all** - reliability unknown
4. **Last commit > 12 months ago with open critical issues** - likely abandoned
5. **Maintainer hostility in issues/PRs** - toxic community
6. **Relicensing history without clear communication** - trust issue
7. **Vendored/copied code without attribution** - legal/ethical risk
8. **Force-pushed to main with no branch protection** - governance failure
9. **Single massive file (> 5000 LOC)** - maintainability nightmare
10. **README says "TODO" in critical sections** - not ready for adoption
