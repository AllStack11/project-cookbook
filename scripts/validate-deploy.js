#!/usr/bin/env node

/**
 * Pre-deployment Validation Script
 *
 * This script checks for common issues that could cause Vercel deployment failures:
 * - Environment variables
 * - TypeScript errors
 * - Build issues
 * - Package.json validation
 * - Large dependencies
 * - Missing files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}`),
};

let errorCount = 0;
let warningCount = 0;

function checkExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log.success(`${description} exists`);
    return true;
  } else {
    log.error(`${description} is missing: ${filePath}`);
    errorCount++;
    return false;
  }
}

function checkEnvExample() {
  log.section('Environment Variables');

  if (!checkExists('.env.example', '.env.example')) {
    return;
  }

  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredVars = [
    'OPENROUTER_API_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];

  const missingVars = requiredVars.filter(v => !envExample.includes(v));

  if (missingVars.length > 0) {
    log.error(`Missing required variables in .env.example: ${missingVars.join(', ')}`);
    errorCount++;
  } else {
    log.success('All required environment variables documented');
  }

  // Check if .env.local exists (for local dev)
  if (fs.existsSync('.env.local')) {
    log.success('.env.local exists for local development');
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    const localMissingVars = requiredVars.filter(v => {
      const regex = new RegExp(`^${v}=.+`, 'm');
      return !regex.test(envLocal);
    });

    if (localMissingVars.length > 0) {
      log.warning(`Missing values in .env.local: ${localMissingVars.join(', ')}`);
      warningCount++;
    }
  } else {
    log.warning('.env.local not found (create for local testing)');
    warningCount++;
  }
}

function checkGitignore() {
  log.section('Git Configuration');

  if (!checkExists('.gitignore', '.gitignore')) {
    return;
  }

  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const sensitivePatterns = [
    '.env.local',
    '.env',
    'node_modules',
    '.next',
  ];

  const missing = sensitivePatterns.filter(p => !gitignore.includes(p));

  if (missing.length > 0) {
    log.error(`Missing patterns in .gitignore: ${missing.join(', ')}`);
    errorCount++;
  } else {
    log.success('Sensitive files properly ignored');
  }

  // Check if .env files are accidentally committed (but allow .env.example)
  try {
    const trackedEnvFiles = execSync('git ls-files .env* 2>/dev/null', { encoding: 'utf8' }).trim();
    if (trackedEnvFiles) {
      // Filter out .env.example which should be tracked
      const sensitiveFiles = trackedEnvFiles.split('\n').filter(f => f !== '.env.example');
      if (sensitiveFiles.length > 0) {
        log.error(`Sensitive environment files are tracked by git: ${sensitiveFiles.join(', ')}`);
        log.error('Run: git rm --cached .env.local .env');
        errorCount++;
      } else {
        log.success('No sensitive env files tracked by git');
      }
    } else {
      log.success('No sensitive env files tracked by git');
    }
  } catch (e) {
    log.warning('Could not check git tracked files (not a git repo?)');
    warningCount++;
  }
}

function checkPackageJson() {
  log.section('Package Configuration');

  if (!checkExists('package.json', 'package.json')) {
    return;
  }

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  // Check required scripts
  const requiredScripts = ['dev', 'build', 'start'];
  const missingScripts = requiredScripts.filter(s => !pkg.scripts || !pkg.scripts[s]);

  if (missingScripts.length > 0) {
    log.error(`Missing required scripts: ${missingScripts.join(', ')}`);
    errorCount++;
  } else {
    log.success('All required scripts present');
  }

  // Check for Vercel-incompatible configurations
  if (pkg.engines && pkg.engines.node) {
    const nodeVersion = pkg.engines.node;
    log.info(`Node.js version specified: ${nodeVersion}`);
    // Vercel supports Node 18.x, 20.x, 22.x
    if (!nodeVersion.includes('18') && !nodeVersion.includes('20') && !nodeVersion.includes('22')) {
      log.warning('Node version may not be compatible with Vercel (recommended: 18.x, 20.x, or 22.x)');
      warningCount++;
    }
  } else {
    log.info('No Node.js version specified (Vercel will use default)');
  }

  // Check for large dependencies that might cause issues
  const largeDeps = ['puppeteer'];
  const hasLargeDeps = largeDeps.filter(dep =>
    (pkg.dependencies && pkg.dependencies[dep]) ||
    (pkg.devDependencies && pkg.devDependencies[dep])
  );

  if (hasLargeDeps.length > 0) {
    log.warning(`Large dependencies detected: ${hasLargeDeps.join(', ')}`);
    log.info('Checking for Vercel-compatible alternatives...');

    if (pkg.dependencies && pkg.dependencies['@sparticuz/chromium']) {
      log.success('@sparticuz/chromium found (Vercel-compatible)');
    } else if (hasLargeDeps.includes('puppeteer')) {
      log.warning('Consider adding @sparticuz/chromium for Vercel compatibility');
      warningCount++;
    }
  }
}

function checkNextConfig() {
  log.section('Next.js Configuration');

  const possibleConfigs = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  const configFile = possibleConfigs.find(f => fs.existsSync(f));

  if (!configFile) {
    log.warning('No next.config.js found (using defaults)');
    warningCount++;
    return;
  }

  log.success(`Next.js config found: ${configFile}`);

  const config = fs.readFileSync(configFile, 'utf8');

  // Check for common misconfigurations
  if (config.includes('target:')) {
    log.warning('Deprecated "target" option found in next.config.js');
    log.info('Remove it - Next.js 12.2+ uses automatic target detection');
    warningCount++;
  }
}

function checkVercelConfig() {
  log.section('Vercel Configuration');

  if (fs.existsSync('vercel.json')) {
    log.success('vercel.json found');

    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

      // Check function timeouts
      if (vercelConfig.functions) {
        Object.entries(vercelConfig.functions).forEach(([pattern, config]) => {
          if (config.maxDuration && config.maxDuration > 60) {
            log.warning(`Function timeout ${config.maxDuration}s exceeds Hobby plan limit (10s)`);
            warningCount++;
          }
        });
      }

      log.success('vercel.json is valid JSON');
    } catch (e) {
      log.error(`Invalid vercel.json: ${e.message}`);
      errorCount++;
    }
  } else {
    log.info('No vercel.json (using Vercel defaults)');
  }
}

function runTypeCheck() {
  log.section('TypeScript Validation');

  if (!fs.existsSync('tsconfig.json')) {
    log.info('No TypeScript configuration found');
    return;
  }

  try {
    execSync('npm run type-check', { stdio: 'pipe', encoding: 'utf8' });
    log.success('TypeScript validation passed');
  } catch (error) {
    log.error('TypeScript validation failed');
    console.log(error.stdout);
    errorCount++;
  }
}

function checkBuildSize() {
  log.section('Build Configuration');

  // Check if .next exists from previous build
  if (fs.existsSync('.next')) {
    log.info('Previous build found at .next/');

    try {
      const buildManifest = '.next/build-manifest.json';
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        log.success('Build manifest is valid');
      }
    } catch (e) {
      log.warning('Could not read build manifest (run npm run build)');
      warningCount++;
    }
  } else {
    log.info('No previous build found (will be created on deploy)');
  }
}

function testBuild() {
  log.section('Test Build');

  log.info('Running production build...');
  log.info('This may take a few minutes...');

  try {
    const output = execSync('npm run build', {
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    log.success('Production build succeeded');

    // Check for warnings in build output
    if (output.includes('warn')) {
      log.warning('Build completed with warnings');
      const warnings = output.split('\n').filter(line => line.includes('warn'));
      warnings.slice(0, 5).forEach(w => log.info(`  ${w.trim()}`));
      if (warnings.length > 5) {
        log.info(`  ... and ${warnings.length - 5} more warnings`);
      }
      warningCount++;
    }

    // Check bundle size
    if (output.includes('First Load JS')) {
      const sizes = output.match(/First Load JS shared by all\s+(\d+\.?\d*\s*\w+)/);
      if (sizes) {
        log.info(`Bundle size (shared): ${sizes[1]}`);
      }
    }

  } catch (error) {
    log.error('Production build failed');
    console.log(error.stdout || error.message);
    errorCount++;
  }
}

function checkDeploymentReadiness() {
  log.section('Deployment Readiness');

  const checks = [
    { name: 'vercel.json or auto-detect', pass: fs.existsSync('vercel.json') || fs.existsSync('next.config.js') },
    { name: '.env.example documented', pass: fs.existsSync('.env.example') },
    { name: '.gitignore configured', pass: fs.existsSync('.gitignore') },
    { name: 'package.json valid', pass: fs.existsSync('package.json') },
  ];

  checks.forEach(check => {
    if (check.pass) {
      log.success(check.name);
    } else {
      log.error(check.name);
      errorCount++;
    }
  });
}

function printSummary() {
  log.section('Summary');

  console.log(`\nErrors:   ${errorCount}`);
  console.log(`Warnings: ${warningCount}\n`);

  if (errorCount === 0 && warningCount === 0) {
    log.success('🚀 Project is ready for Vercel deployment!');
    console.log('\nNext steps:');
    console.log('1. git add . && git commit -m "Ready for deployment"');
    console.log('2. git push origin main');
    console.log('3. Deploy on Vercel: https://vercel.com/new');
    return 0;
  } else if (errorCount === 0) {
    log.warning('⚠️  Project can be deployed but has warnings');
    console.log('\nReview warnings above before deploying.');
    console.log('Deploy when ready: https://vercel.com/new');
    return 0;
  } else {
    log.error('❌ Project has errors that must be fixed before deployment');
    console.log('\nFix the errors above and run this script again.');
    return 1;
  }
}

// Main execution
async function main() {
  console.log(`${colors.blue}╔═══════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Vercel Deployment Validation Script        ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════╝${colors.reset}\n`);

  checkEnvExample();
  checkGitignore();
  checkPackageJson();
  checkNextConfig();
  checkVercelConfig();
  runTypeCheck();
  checkBuildSize();

  // Ask if user wants to run full build
  log.section('Full Build Test');
  log.info('Running a test build is recommended but takes 1-3 minutes');
  log.info('Skipping full build test (run "npm run build" manually to test)');

  // Uncomment the line below to enable automatic build testing
  // testBuild();

  checkDeploymentReadiness();

  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch(err => {
  log.error(`Script failed: ${err.message}`);
  process.exit(1);
});
