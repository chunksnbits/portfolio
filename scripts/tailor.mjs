// Starts Claude Code on the /tailor skill for a job posting: the entry point for a new variant.
// see: .claude/skills/tailor/SKILL.md
//
// Usage: npm run tailor -- <job-url>
import { spawn } from 'node:child_process';

const [url] = process.argv.slice(2);
if (!url) {
  console.error('Usage: npm run tailor -- <job-url>');
  process.exit(1);
}
const claude = spawn('claude', [`/tailor ${url}`], { stdio: 'inherit' });
claude.on('error', (error) => {
  console.error(error.code === 'ENOENT' ? 'claude is not on PATH. Install Claude Code first.' : error.message);
  process.exit(1);
});
claude.on('exit', (code) => process.exit(code ?? 0));
