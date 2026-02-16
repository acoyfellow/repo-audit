import type { CategoryKey } from './categories';
import type { GitHubRepoData } from './github';

export type ScoreResult = {
  scores: Record<CategoryKey, number>;
  details: Record<CategoryKey, string[]>;
};

export function scoreRepo(data: GitHubRepoData): ScoreResult {
  const { meta, community, readme = '', rootFiles, allPaths, releases, workflows, contributors, commits, tsconfigContent } = data;

  const scores = {} as Record<CategoryKey, number>;
  const details = {} as Record<CategoryKey, string[]>;

  const has = (pats: string[]) => allPaths.some((f) => pats.some((p) => f.includes(p)));
  const hasR = (pats: string[]) => rootFiles.some((f) => pats.some((p) => f.includes(p)));
  const rm = readme.toLowerCase();

  let s = 0;
  let d: string[] = [];

  // 1. First Impressions
  s = 0;
  d = [];
  if (meta.description && meta.description.length > 10) {
    s += 2;
    d.push('Has description');
  } else {
    d.push('Missing or weak description');
  }
  if ((meta.topics || []).length >= 3) {
    s += 2;
    d.push(`${(meta.topics || []).length} topics`);
  } else if ((meta.topics || []).length > 0) {
    s += 1;
    d.push(`Only ${(meta.topics || []).length} topic(s)`);
  } else {
    d.push('No topics/tags');
  }
  if (meta.stargazers_count >= 1000) s += 2;
  else if (meta.stargazers_count >= 100) s += 1.5;
  else if (meta.stargazers_count >= 10) s += 1;
  d.push(`${meta.stargazers_count} stars, ${meta.forks_count} forks`);
  if (meta.forks_count >= 100) s += 1;
  else if (meta.forks_count >= 10) s += 0.5;
  if (meta.homepage) {
    s += 1.5;
    d.push('Has homepage link');
  } else {
    d.push('No homepage link');
  }
  if (meta.description && meta.description.length > 40) s += 0.5;
  scores.firstImpressions = Math.min(10, s);
  details.firstImpressions = d;

  // 2. README
  s = 0;
  d = [];
  if (readme.length > 5000) {
    s += 2;
    d.push('Comprehensive length');
  } else if (readme.length > 1000) {
    s += 1;
    d.push('Adequate length');
  } else if (readme.length > 200) {
    s += 0.5;
    d.push('Brief README');
  } else {
    d.push('No README or very thin');
  }
  if (rm.includes('install') || rm.includes('getting started') || rm.includes('setup')) {
    s += 1.5;
    d.push('Has setup section');
  } else {
    d.push('Missing install instructions');
  }
  if (rm.includes('usage') || rm.includes('example') || rm.includes('how to')) {
    s += 1;
    d.push('Has usage info');
  } else {
    d.push('Missing usage examples');
  }
  const cbm = rm.match(/```/g);
  const cb = cbm ? Math.floor(cbm.length / 2) : 0;
  if (cb >= 3) {
    s += 1.5;
    d.push(`${cb} code blocks`);
  } else if (cb >= 1) {
    s += 0.75;
    d.push('Has code blocks');
  } else {
    d.push('No code examples');
  }
  if (rm.includes('shields.io') || rm.includes('badgen') || rm.includes('[![')) {
    s += 1;
    d.push('Has badges');
  } else {
    d.push('No badges');
  }
  if (rm.includes('## ') || rm.includes('# ')) {
    s += 0.5;
    d.push('Structured headers');
  }
  if (rm.includes('.gif') || rm.includes('.png') || rm.includes('.jpg') || rm.includes('screenshot') || rm.includes('.svg')) {
    s += 1;
    d.push('Has visual media');
  } else {
    d.push('No screenshots/demos');
  }
  if (rm.includes('license')) {
    s += 0.5;
    d.push('References license');
  }
  scores.readme = Math.min(10, s);
  details.readme = d;

  // 3. Documentation
  s = 0;
  d = [];
  if (has(['docs/', 'documentation/'])) {
    s += 2;
    d.push('Has docs directory');
  } else {
    d.push('No docs directory');
  }
  {
    const diataxis = [
      { p: 'docs/tutorials/', label: 'tutorials' },
      { p: 'docs/how-to/', label: 'how-to' },
      { p: 'docs/reference/', label: 'reference' },
      { p: 'docs/explanation/', label: 'explanation' },
    ];
    const found = diataxis.filter((x) => has([x.p])).map((x) => x.label);
    if (found.length >= 3) {
      s += 2;
      d.push(`Docs structured (Diataxis: ${found.join(', ')})`);
    } else if (found.length >= 1) {
      s += 1;
      d.push(`Partial docs structure (Diataxis: ${found.join(', ')})`);
    } else {
      d.push('Docs not structured (Diataxis)');
    }
  }
  if (meta.homepage && !String(meta.homepage).includes('github.com')) {
    s += 2;
    d.push('Has external homepage');
  } else {
    d.push('No dedicated docs site');
  }
  if (meta.has_wiki) {
    s += 0.5;
    d.push('Wiki enabled');
  }
  if (has(['api.md', 'api-reference', 'openapi', 'swagger'])) {
    s += 1.5;
    d.push('Has API docs');
  }
  if (has(['guide', 'tutorial', 'cookbook'])) {
    s += 1.5;
    d.push('Has guides');
  }
  if (has(['changelog', 'changes.md'])) {
    s += 1;
    d.push('Has changelog');
  } else {
    d.push('No changelog');
  }
  if (has(['migration', 'upgrade'])) {
    s += 1;
    d.push('Migration guide');
  }
  scores.documentation = Math.min(10, s);
  details.documentation = d;

  // 4. Code Quality
  s = 0;
  d = [];
  if (has(['tsconfig', '.ts', '.tsx'])) {
    s += 2;
    d.push('TypeScript');
  } else {
    d.push('No TypeScript');
  }
  // Parse tsconfig.json and check strict settings
  if (tsconfigContent) {
    try {
      const tsconfig = JSON.parse(tsconfigContent);
      const co = tsconfig.compilerOptions || {};
      if (co.strict === true) {
        s += 1.5;
        d.push('strict mode enabled');
      } else {
        // Check individual strict flags
        const strictFlags = ['noImplicitAny', 'strictNullChecks', 'strictFunctionTypes', 'noImplicitReturns'];
        const enabled = strictFlags.filter(f => co[f] === true);
        if (enabled.length >= 3) {
          s += 1;
          d.push(`${enabled.length}/4 strict flags`);
        } else if (enabled.length >= 1) {
          s += 0.5;
          d.push(`Only ${enabled.length}/4 strict flags`);
        } else {
          d.push('No strict flags in tsconfig');
        }
      }
      // Check for noImplicitAny specifically when not using strict
      if (co.strict !== true && co.noImplicitAny === false) {
        d.push('noImplicitAny disabled — weak typing');
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  if (has(['.eslintrc', 'eslint.config', 'biome.json', '.prettierrc', 'prettier.config', 'deno.json'])) {
    s += 1.5;
    d.push('Has linter/formatter');
  } else {
    d.push('No linter config');
  }
  if (has(['.editorconfig'])) {
    s += 0.5;
    d.push('.editorconfig');
  }
  const dirs: Record<string, true> = {};
  allPaths.forEach((p) => {
    if (p.includes('/')) dirs[p.split('/')[0]!] = true;
  });
  const dc = Object.keys(dirs).length;
  if (dc >= 5) {
    s += 1.5;
    d.push(`Well-organized (${dc} dirs)`);
  } else if (dc >= 3) {
    s += 1;
    d.push(`Basic structure (${dc} dirs)`);
  } else {
    d.push('Flat structure');
  }
  if (has(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'cargo.lock', 'go.sum'])) {
    s += 1;
    d.push('Has lockfile');
  } else {
    d.push('No lockfile');
  }
  if (meta.language) {
    s += 0.5;
    d.push(`Language: ${meta.language}`);
  }
  if (has(['src/', 'lib/', 'pkg/'])) {
    s += 1.5;
    d.push('Has source directory');
  }
  if (has(['.env.example', '.env.template', '.dev.vars.example'])) {
    s += 0.5;
    d.push('Env template');
  }
  scores.codeQuality = Math.min(10, s);
  details.codeQuality = d;

  // 5. Testing
  s = 0;
  d = [];
  if (has(['test/', 'tests/', '__tests__/', 'spec/', '_test.go', '.test.', '.spec.'])) {
    s += 3;
    d.push('Has test files');
  } else {
    d.push('No tests found');
  }
  if (has(['jest.config', 'vitest.config', 'pytest.ini', 'phpunit', '.mocharc'])) {
    s += 1.5;
    d.push('Test framework config');
  }
  if (has(['cypress/', 'playwright', 'e2e/'])) {
    s += 1.5;
    d.push('E2E tests');
  }
  if (has(['codecov', 'coveralls', 'coverage', '.nycrc'])) {
    s += 1.5;
    d.push('Coverage tracking');
  } else {
    d.push('No coverage config');
  }
  if (has(['benchmark', 'bench/'])) {
    s += 1;
    d.push('Benchmarks');
  }
  if (has(['fixture', 'mock', '__mocks__'])) {
    s += 0.5;
    d.push('Test fixtures');
  }
  scores.testing = Math.min(10, s);
  details.testing = d;

  // 6. CI/CD
  s = 0;
  d = [];
  if (workflows.length > 0) {
    s += 3;
    d.push(`${workflows.length} GH Actions workflow(s)`);
  } else if (has(['.github/workflows/'])) {
    s += 2.5;
    d.push('Has workflow files');
  } else if (has(['.travis.yml', '.circleci', '.gitlab-ci'])) {
    s += 2;
    d.push('Has CI config');
  } else {
    d.push('No CI/CD found');
  }
  if (workflows.length >= 3) s += 1;
  if (has(['dependabot.yml', 'renovate.json'])) {
    s += 1.5;
    d.push('Dependency bot');
  } else {
    d.push('No dependency automation');
  }
  if (has(['.changeset', '.releaserc', 'semantic-release'])) {
    s += 2;
    d.push('Release automation');
  } else if (releases.length > 0) {
    s += 1;
    d.push(`${releases.length} releases`);
  } else {
    d.push('No releases');
  }
  if (has(['dockerfile', 'docker-compose', '.devcontainer'])) {
    s += 1;
    d.push('Containerization');
  }
  scores.cicd = Math.min(10, s);
  details.cicd = d;

  // 7. Security
  s = 0;
  d = [];
  const cpf = (community?.files) || {};
  if (cpf.security) {
    s += 2.5;
    d.push('SECURITY.md');
  } else if (hasR(['security'])) {
    s += 2;
    d.push('Security file');
  } else {
    d.push('No SECURITY.md');
  }
  if (has(['dependabot.yml', 'renovate'])) {
    s += 1.5;
    d.push('Dependency scanning');
  }
  if (has(['.github/codeowners'])) {
    s += 1;
    d.push('CODEOWNERS');
  }
  if (has(['.gitignore'])) {
    s += 0.5;
    d.push('.gitignore');
  }
  if (has(['.env.example', '.dev.vars.example'])) {
    s += 0.5;
    d.push('Env templated');
  }
  if (has(['snyk', '.trivy'])) {
    s += 1.5;
    d.push('Security scanning');
  }
  if (meta.allow_forking !== false) s += 0.5;
  if (d.length <= 1) {
    s += 0.5;
    d.push('Minimal security posture');
  }
  scores.security = Math.min(10, s);
  details.security = d;

  // 8. Community
  s = 0;
  d = [];
  if (cpf.contributing) {
    s += 2;
    d.push('CONTRIBUTING.md');
  } else if (hasR(['contributing'])) {
    s += 1.5;
    d.push('Contributing file');
  } else {
    d.push('No CONTRIBUTING.md');
  }
  if (cpf.code_of_conduct) {
    s += 1;
    d.push('Code of Conduct');
  } else {
    d.push('No Code of Conduct');
  }
  if (cpf.issue_template || has(['.github/issue_template'])) {
    s += 1.5;
    d.push('Issue templates');
  } else {
    d.push('No issue templates');
  }
  if (cpf.pull_request_template || has(['pull_request_template'])) {
    s += 1;
    d.push('PR template');
  } else {
    d.push('No PR template');
  }
  if (meta.has_discussions) {
    s += 1;
    d.push('Discussions enabled');
  }
  if (rm.includes('discord') || rm.includes('slack')) {
    s += 0.5;
    d.push('Community links');
  }
  if (contributors.length >= 10) {
    s += 1.5;
    d.push(`${contributors.length} contributors`);
  } else if (contributors.length >= 3) {
    s += 0.75;
    d.push(`${contributors.length} contributors`);
  } else {
    d.push('Few contributors');
  }
  scores.community = Math.min(10, s);
  details.community = d;

  // 9. Maintenance
  s = 0;
  d = [];
  if (commits.length > 0) {
    const days = (Date.now() - new Date(commits[0].commit.author.date).getTime()) / 86400000;
    if (days < 7) {
      s += 3;
      d.push('Active this week');
    } else if (days < 30) {
      s += 2.5;
      d.push('Active this month');
    } else if (days < 90) {
      s += 1.5;
      d.push('Active this quarter');
    } else if (days < 365) {
      s += 0.5;
      d.push(`Last commit ${Math.floor(days)}d ago`);
    } else {
      d.push(`Stale: ${Math.floor(days)} days idle`);
    }
  } else {
    d.push('No commit data');
  }
  if (releases.length >= 5) {
    s += 2;
    d.push(`${releases.length} releases`);
  } else if (releases.length >= 2) {
    s += 1.5;
    d.push(`${releases.length} releases`);
  } else if (releases.length === 1) {
    s += 0.5;
    d.push('1 release');
  } else {
    d.push('No releases');
  }
  if (meta.open_issues_count < 10) {
    s += 1.5;
    d.push(`${meta.open_issues_count} open issues`);
  } else if (meta.open_issues_count < 50) {
    s += 1;
    d.push(`${meta.open_issues_count} issues`);
  } else {
    d.push(`${meta.open_issues_count} open issues (backlog)`);
  }
  const bf = contributors.filter((c: any) => c.contributions > 10).length;
  if (bf >= 5) {
    s += 2;
    d.push(`Strong bus factor (${bf})`);
  } else if (bf >= 2) {
    s += 1;
    d.push(`Bus factor: ${bf}`);
  } else {
    s += 0.25;
    d.push('Low bus factor');
  }
  if (commits.length >= 20) s += 0.5;
  if (meta.archived) {
    s = Math.min(s, 2);
    d.unshift('ARCHIVED');
  }
  scores.maintenance = Math.min(10, s);
  details.maintenance = d;

  // 10. DX
  s = 0;
  d = [];
  if (has(['changelog'])) {
    s += 1;
    d.push('Changelog');
  } else {
    d.push('No changelog');
  }
  if (has(['examples/', 'example/', 'demo/'])) {
    s += 1.5;
    d.push('Examples dir');
  } else {
    d.push('No examples dir');
  }
  if (has(['.devcontainer'])) {
    s += 1;
    d.push('Devcontainer');
  }
  if (has(['docker-compose', 'makefile', 'justfile'])) {
    s += 1;
    d.push('Dev tooling');
  }
  if (has(['playground', 'sandbox'])) {
    s += 0.5;
    d.push('Playground');
  }
  if (rm.includes('stackblitz') || rm.includes('codesandbox')) {
    s += 0.5;
    d.push('Online playground');
  }
  if (has(['tsconfig']) || meta.language === 'TypeScript') {
    s += 1;
    d.push('Type support');
  }
  if (has(['.vscode/'])) {
    s += 0.5;
    d.push('VS Code config');
  }
  if (/npm install|npm i |yarn add|pnpm add|pip install|cargo add|go get|bun add/i.test(readme)) {
    s += 1.5;
    d.push('Install cmd in README');
  }
  if (has(['.env.example', '.dev.vars.example'])) {
    s += 0.5;
    d.push('Env template');
  }
  if (meta.homepage && !String(meta.homepage).includes('github.com')) {
    s += 0.5;
    d.push('Live demo');
  }
  scores.dx = Math.min(10, s);
  details.dx = d;

  // 11. Licensing
  s = 0;
  d = [];
  if (meta.license) {
    s += 4;
    d.push(`License: ${meta.license.spdx_id || meta.license.name}`);
    const osi = ['MIT', 'Apache-2.0', 'GPL-3.0', 'GPL-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0', 'Unlicense', '0BSD'];
    if (osi.includes(meta.license.spdx_id)) {
      s += 3;
      d.push('OSI-approved');
    } else {
      s += 1;
      d.push('Non-standard');
    }
  } else {
    d.push('NO LICENSE FILE');
  }
  if (hasR(['license'])) s += 1;
  if (meta.license && (meta.license.spdx_id === 'MIT' || meta.license.spdx_id === 'Apache-2.0')) {
    s += 1;
    d.push('Business-friendly');
  }
  scores.licensing = Math.min(10, s);
  details.licensing = d;

  return { scores, details };
}
