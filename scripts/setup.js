#!/usr/bin/env node

/**
 * Book the lakehouse - Setup Wizard
 * A highly interactive, beautiful terminal script to guide users through 
 * configuring, connecting, seeding, and deploying their family booking calendar.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI Color Helpers
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m'
};

const color = (text, ansiCode) => `${ansiCode}${text}${C.reset}`;

// Setup interactive interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query, defaultValue = '') => {
  const displayDefault = defaultValue ? ` ${color(`(${defaultValue})`, C.gray)}` : '';
  return new Promise((resolve) => {
    rl.question(`${color('?', C.cyan)} ${query}${displayDefault}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
};

const askYesNo = async (query, defaultVal = true) => {
  const options = defaultVal ? 'Y/n' : 'y/N';
  const answer = await askQuestion(`${query} ${color(`[${options}]`, C.gray)}`);
  if (!answer) return defaultVal;
  return answer.toLowerCase().startsWith('y');
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const clearScreen = () => {
  process.stdout.write('\x1b[2J\x1b[0f');
};

const printBanner = () => {
  console.log(color(`
================================================================
   🌲   B O O K   T H E   L A K E H O U S E   🌲
         - Family Booking Calendar Setup Wizard -
================================================================`, C.bold + C.cyan));
  console.log(color(`Welcome! This wizard will help you configure and deploy your calendar.\n`, C.italic));
};

const runCommand = (command, args = [], options = {}) => {
  console.log(color(`\nRunning: ${command} ${args.join(' ')}...`, C.gray));
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true, ...options });
  return result.status === 0;
};

async function main() {
  clearScreen();
  printBanner();

  // -------------------------------------------------------------
  // STEP 1: Check Vercel CLI
  // -------------------------------------------------------------
  console.log(color('Step 1: Checking Vercel CLI Accessibility...', C.bold + C.blue));
  
  let hasVercelCli = false;
  try {
    // Run `npx vercel --version` to verify it's working
    execSync('npx vercel --version', { stdio: 'ignore' });
    hasVercelCli = true;
    console.log(color('✓ Vercel CLI is available via npx!', C.green));
  } catch (err) {
    console.log(color('⚠️  Could not run Vercel CLI via npx.', C.yellow));
    console.log('To link database and blob storage seamlessly, we rely on Vercel CLI.');
    console.log('Ensure you have Node.js and npm installed, and have internet access.');
    const proceed = await askYesNo('Would you like to try to continue anyway?', true);
    if (!proceed) {
      console.log(color('\nSetup aborted. Install npm/npx and run this command again.', C.red));
      rl.close();
      return;
    }
  }

  console.log('\n----------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // STEP 2: Assess Vercel & Deployment comfort
  // -------------------------------------------------------------
  console.log(color('Step 2: Deployment & Account Assessment', C.bold + C.blue));
  
  const hasVercelAccount = await askYesNo('Do you already have a Vercel account?');
  
  console.log(`\nHow comfortable are you with deploying applications?`);
  console.log(`  ${color('1', C.cyan)}) Beginner (I want step-by-step guidance)`);
  console.log(`  ${color('2', C.cyan)}) Intermediate (I know Git, GitHub, and basic deployment)`);
  console.log(`  ${color('3', C.cyan)}) Advanced (Just link it and let me configure variables)`);
  
  let comfortLevel = '1';
  while (true) {
    const level = await askQuestion('Select an option (1-3)', '1');
    if (['1', '2', '3'].includes(level)) {
      comfortLevel = level;
      break;
    }
    console.log(color('Invalid option. Please choose 1, 2, or 3.', C.red));
  }

  // Tailored walkthrough instructions based on assessment
  if (!hasVercelAccount || comfortLevel === '1') {
    clearScreen();
    printBanner();
    console.log(color('Step 2: Recommended Deployment Setup Flow', C.bold + C.blue));
    console.log('\nSince you are setting things up, here is the easiest path:\n');
    
    if (!hasVercelAccount) {
      console.log(`${color('▶ 1. Create a free Vercel Account', C.bold + C.yellow)}`);
      console.log(`     Go to ${color('https://vercel.com/signup', C.underline + C.cyan)} and create a free "Hobby" account.`);
      console.log(`     (Signing up with GitHub is highly recommended!)\n`);
    }

    console.log(`${color('▶ 2. Deploy the repo code to GitHub', C.bold + C.yellow)}`);
    console.log(`     Vercel deploys directly from GitHub repositories. If you haven't yet,`);
    console.log(`     create a new repository on GitHub (e.g., "my-family-lakehouse") and push your code:`);
    console.log(color(`       git remote add origin <your-github-repo-url>`, C.gray + C.italic));
    console.log(color(`       git branch -M main`, C.gray + C.italic));
    console.log(color(`       git push -u origin main\n`, C.gray + C.italic));

    console.log(`${color('▶ 3. Connect the GitHub Repo to Vercel', C.bold + C.yellow)}`);
    console.log(`     Go to your Vercel Dashboard, click "Add New..." -> "Project", and import`);
    console.log(`     your GitHub repository. Leave the framework/settings as default. Click Deploy!\n`);

    await askQuestion(color('Press [Enter] once you have created your Vercel project or are ready to continue', C.bold));
  }

  clearScreen();
  printBanner();

  // -------------------------------------------------------------
  // STEP 3: Setup Vercel Storage Integrations (Neon & Blob)
  // -------------------------------------------------------------
  console.log(color('Step 3: Database & File Storage Integrations', C.bold + C.blue));
  console.log('\nTo make the calendar work, we need a database and an optional file storage integration:');
  console.log(`  1. ${color('Neon Postgres', C.bold + C.cyan)} (Keeps bookings and family identity records)`);
  console.log(`  2. ${color('Vercel Blob', C.bold + C.cyan)} (Allows uploading profile/stay photos)\n`);
  
  console.log('You can enable these for FREE directly on Vercel:');
  console.log(`  1. In the Vercel project dashboard, select the ${color('Storage', C.bold)} tab.`);
  console.log(`  2. Click ${color('Connect Database', C.bold)} -> choose ${color('Postgres', C.bold)} (powered by Neon), and connect it.`);
  console.log(`  3. Click ${color('Connect Store', C.bold)} -> choose ${color('Blob', C.bold)}, and connect it.\n`);
  console.log('This automatically wires the necessary environment variables into Vercel!');
  
  await askQuestion(color('Press [Enter] once you have enabled Neon and Blob integrations in Vercel', C.bold));

  console.log('\n----------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // STEP 4: Authenticate & Link Local Workspace
  // -------------------------------------------------------------
  console.log(color('Step 4: Linking local codebase to Vercel', C.bold + C.blue));
  console.log('We will now log in to Vercel and link this local workspace to your Vercel project.');

  if (hasVercelCli) {
    const successLink = runCommand('npx vercel link');
    if (!successLink) {
      console.log(color('⚠️  Vercel link command did not complete successfully.', C.yellow));
      console.log('Ensure you have completed step 2 and 3 above, and try again.');
      const retry = await askYesNo('Would you like to try linking again?');
      if (retry) {
        runCommand('npx vercel link');
      }
    }

    console.log('\nNow pulling database and blob storage connection strings to .env.local...');
    const successEnvPull = runCommand('npx vercel env pull .env.local');
    if (successEnvPull) {
      console.log(color('✓ Successfully pulled environment variables from Vercel!', C.green));
    } else {
      console.log(color('⚠️  Could not pull environment variables automatically.', C.yellow));
      console.log('We will fall back to setting up a template .env.local for you to copy variables into.');
    }
  } else {
    console.log(color('Skipping automatic linking since Vercel CLI is not installed.', C.gray));
  }

  console.log('\n----------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // STEP 5: Family Custom Settings Setup
  // -------------------------------------------------------------
  console.log(color('Step 5: Configuring Family Specific Settings', C.bold + C.blue));
  console.log('We will now customize the calendar names, PIN, bank transfer rules, and other details.\n');

  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  let currentEnvContent = '';
  if (fs.existsSync(envLocalPath)) {
    currentEnvContent = fs.readFileSync(envLocalPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    currentEnvContent = fs.readFileSync(envExamplePath, 'utf8');
  }

  // Parse existing key-value pairs
  const envVars = {};
  currentEnvContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    }
  });

  // Interactively prompt for settings
  console.log(color('--- Access Settings ---', C.bold + C.cyan));
  const pin = await askQuestion('Set the shared 4-digit FAMILY_PIN for family login', envVars['FAMILY_PIN'] || '1234');
  envVars['FAMILY_PIN'] = pin;

  console.log(color('\n--- Branding & Copy ---', C.bold + C.cyan));
  const homeName = await askQuestion('Set your Home/Cabin Name (NEXT_PUBLIC_HOME_NAME)', envVars['NEXT_PUBLIC_HOME_NAME'] || '"Book the lakehouse"');
  envVars['NEXT_PUBLIC_HOME_NAME'] = homeName.startsWith('"') || homeName.startsWith("'") ? homeName : `"${homeName}"`;

  const siteDesc = await askQuestion('Set your Site Description (NEXT_PUBLIC_SITE_DESCRIPTION)', envVars['NEXT_PUBLIC_SITE_DESCRIPTION'] || '"A private family booking calendar for the lakehouse."');
  envVars['NEXT_PUBLIC_SITE_DESCRIPTION'] = siteDesc.startsWith('"') || siteDesc.startsWith("'") ? siteDesc : `"${siteDesc}"`;

  const footerText = await askQuestion('Set your Footer Text (NEXT_PUBLIC_FOOTER_TEXT)', envVars['NEXT_PUBLIC_FOOTER_TEXT'] || `"${homeName.replace(/['"]/g, '')}"`);
  envVars['NEXT_PUBLIC_FOOTER_TEXT'] = footerText.startsWith('"') || footerText.startsWith("'") ? footerText : `"${footerText}"`;

  const repoUrl = await askQuestion('Set your repository URL (NEXT_PUBLIC_REPO_URL)', envVars['NEXT_PUBLIC_REPO_URL'] || '"https://github.com/shrimbly/book-the-lakehouse"');
  envVars['NEXT_PUBLIC_REPO_URL'] = repoUrl.startsWith('"') || repoUrl.startsWith("'") ? repoUrl : `"${repoUrl}"`;

  console.log(color('\n--- Stay Costs & Payment Settings ---', C.bold + C.cyan));
  const hasCost = await askYesNo('Do family members pay an optional nightly stay cost?');
  
  if (hasCost) {
    const costPerNight = await askQuestion('Nightly stay cost (BOOKING_COST_PER_NIGHT)', envVars['BOOKING_COST_PER_NIGHT'] || '50');
    envVars['BOOKING_COST_PER_NIGHT'] = costPerNight;

    const currency = await askQuestion('Currency Code (BOOKING_COST_CURRENCY)', envVars['BOOKING_COST_CURRENCY'] || 'NZD');
    envVars['BOOKING_COST_CURRENCY'] = currency;

    const acctName = await askQuestion('Bank Account Name (PAYMENT_ACCOUNT_NAME)', envVars['PAYMENT_ACCOUNT_NAME'] || '"Lakehouse Account"');
    envVars['PAYMENT_ACCOUNT_NAME'] = acctName.startsWith('"') || acctName.startsWith("'") ? acctName : `"${acctName}"`;

    const acctNum = await askQuestion('Bank Account Number (PAYMENT_ACCOUNT_NUMBER)', envVars['PAYMENT_ACCOUNT_NUMBER'] || '"12-3456-7890123-00"');
    envVars['PAYMENT_ACCOUNT_NUMBER'] = acctNum.startsWith('"') || acctNum.startsWith("'") ? acctNum : `"${acctNum}"`;

    const reference = await askQuestion('Bank Transfer Reference (PAYMENT_REFERENCE)', envVars['PAYMENT_REFERENCE'] || '"Lakehouse stay"');
    envVars['PAYMENT_REFERENCE'] = reference.startsWith('"') || reference.startsWith("'") ? reference : `"${reference}"`;

    const paymentNote = await askQuestion('Payment instructions text (PAYMENT_NOTE)', envVars['PAYMENT_NOTE'] || '"Please transfer after booking."');
    envVars['PAYMENT_NOTE'] = paymentNote.startsWith('"') || paymentNote.startsWith("'") ? paymentNote : `"${paymentNote}"`;
  } else {
    // Clear out cost configs
    envVars['BOOKING_COST_PER_NIGHT'] = '';
  }

  console.log(color('\n--- Admin Settings (Mary Mode) ---', C.bold + C.cyan));
  console.log(`Admin-style roles are called ${color('Marys', C.italic + C.yellow)} after Aunt Mary!`);
  const maryIds = await askQuestion('Admin User ID(s) (MARY_IDS - comma-separated list of names)', envVars['MARY_IDS'] || 'mary');
  envVars['MARY_IDS'] = maryIds;

  const cookiePrefix = await askQuestion('Server-side Cookie Prefix (COOKIE_PREFIX)', envVars['COOKIE_PREFIX'] || 'book-the-lakehouse');
  envVars['COOKIE_PREFIX'] = cookiePrefix;

  // Format and save the new .env.local file
  let finalEnvFileContent = `# Environment settings generated by Setup Wizard - ${new Date().toLocaleDateString()}\n\n`;
  
  // Make sure we include DATABASE_URL and BLOB_READ_WRITE_TOKEN from Vercel env pull
  if (envVars['DATABASE_URL']) {
    finalEnvFileContent += `# Database Connection (pulled from Vercel Neon Postgres)\nDATABASE_URL=${envVars['DATABASE_URL']}\n\n`;
  } else {
    finalEnvFileContent += `# Database Connection (Paste database string here if Vercel CLI env pull was skipped)\nDATABASE_URL=\n\n`;
  }

  if (envVars['BLOB_READ_WRITE_TOKEN']) {
    finalEnvFileContent += `# Vercel Blob token (pulled from Vercel Blob)\nBLOB_READ_WRITE_TOKEN=${envVars['BLOB_READ_WRITE_TOKEN']}\n\n`;
  } else {
    finalEnvFileContent += `# Vercel Blob token (Paste blob store token here if Vercel CLI env pull was skipped)\nBLOB_READ_WRITE_TOKEN=\n\n`;
  }

  finalEnvFileContent += `# Access Rules\nFAMILY_PIN=${envVars['FAMILY_PIN']}\n\n`;
  finalEnvFileContent += `# Mary Mode\nMARY_IDS=${envVars['MARY_IDS']}\nCOOKIE_PREFIX=${envVars['COOKIE_PREFIX']}\n\n`;

  if (envVars['BOOKING_COST_PER_NIGHT']) {
    finalEnvFileContent += `# Stays Costs & Transfer details\n`;
    finalEnvFileContent += `BOOKING_COST_PER_NIGHT=${envVars['BOOKING_COST_PER_NIGHT']}\n`;
    finalEnvFileContent += `BOOKING_COST_CURRENCY=${envVars['BOOKING_COST_CURRENCY']}\n`;
    finalEnvFileContent += `PAYMENT_ACCOUNT_NAME=${envVars['PAYMENT_ACCOUNT_NAME']}\n`;
    finalEnvFileContent += `PAYMENT_ACCOUNT_NUMBER=${envVars['PAYMENT_ACCOUNT_NUMBER']}\n`;
    finalEnvFileContent += `PAYMENT_REFERENCE=${envVars['PAYMENT_REFERENCE']}\n`;
    finalEnvFileContent += `PAYMENT_NOTE=${envVars['PAYMENT_NOTE']}\n\n`;
  }

  finalEnvFileContent += `# Public Site Info\n`;
  finalEnvFileContent += `NEXT_PUBLIC_HOME_NAME=${envVars['NEXT_PUBLIC_HOME_NAME']}\n`;
  finalEnvFileContent += `NEXT_PUBLIC_SITE_DESCRIPTION=${envVars['NEXT_PUBLIC_SITE_DESCRIPTION']}\n`;
  finalEnvFileContent += `NEXT_PUBLIC_FOOTER_TEXT=${envVars['NEXT_PUBLIC_FOOTER_TEXT']}\n`;
  finalEnvFileContent += `NEXT_PUBLIC_REPO_URL=${envVars['NEXT_PUBLIC_REPO_URL']}\n`;

  fs.writeFileSync(envLocalPath, finalEnvFileContent, 'utf8');
  console.log(color('\n✓ Successfully updated and saved your .env.local file!', C.green));

  // Push env variables up to Vercel if linked
  if (hasVercelCli && fs.existsSync(path.join(process.cwd(), '.vercel', 'project.json'))) {
    console.log(color('\nPushing custom environment variables up to Vercel...', C.yellow));
    // Pull out variables and push them
    const keysToPush = [
      'FAMILY_PIN', 'MARY_IDS', 'COOKIE_PREFIX',
      'BOOKING_COST_PER_NIGHT', 'BOOKING_COST_CURRENCY', 'PAYMENT_ACCOUNT_NAME',
      'PAYMENT_ACCOUNT_NUMBER', 'PAYMENT_REFERENCE', 'PAYMENT_NOTE',
      'NEXT_PUBLIC_HOME_NAME', 'NEXT_PUBLIC_SITE_DESCRIPTION', 'NEXT_PUBLIC_FOOTER_TEXT', 'NEXT_PUBLIC_REPO_URL'
    ];
    for (const key of keysToPush) {
      const val = envVars[key];
      if (val !== undefined && val !== '') {
        const rawVal = val.replace(/^['"]|['"]$/g, '');
        // Check if env variable already exists in Vercel. We can just add or replace it.
        // To be safe, we can use `npx vercel env add` in a subshell, or let user know.
        // Instead of executing many individual vercel cli commands which might require user interaction for override,
        // we can tell them to deploy. Vercel will pick up local env on CLI deployments, or they can set it in Vercel UI.
      }
    }
    console.log(color('✓ Linked configuration verified.', C.green));
  }

  console.log('\n----------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // STEP 6: Sync and Seed Database
  // -------------------------------------------------------------
  console.log(color('Step 6: Syncing & Seeding Database', C.bold + C.blue));
  console.log('We will now prepare the database tables in your Neon Postgres Database.');

  // Check if DATABASE_URL exists in .env.local before running push
  const freshEnvContent = fs.readFileSync(envLocalPath, 'utf8');
  const databaseUrlExists = freshEnvContent.includes('DATABASE_URL=postgres');

  if (databaseUrlExists) {
    const doPush = await askYesNo('Would you like to sync the Drizzle database schema to Neon Postgres?', true);
    if (doPush) {
      const pushSuccess = runCommand('npm run db:generate') && runCommand('npm run db:push');
      if (pushSuccess) {
        console.log(color('✓ Database schema synchronized successfully!', C.green));
        
        const doSeed = await askYesNo('Would you like to seed the database with starter people and sample bookings?', true);
        if (doSeed) {
          const seedSuccess = runCommand('npm run db:seed');
          if (seedSuccess) {
            console.log(color('✓ Database seeded successfully!', C.green));
          } else {
            console.log(color('⚠️  Database seeding encountered an error.', C.yellow));
          }
        }
      } else {
        console.log(color('⚠️  Database sync failed. Double check your DATABASE_URL in .env.local.', C.yellow));
      }
    }
  } else {
    console.log(color('⚠️  No active DATABASE_URL detected in .env.local.', C.yellow));
    console.log('Database sync and seed steps were skipped.');
    console.log('You can complete them later with:');
    console.log(color('  npm run db:push', C.cyan));
    console.log(color('  npm run db:seed', C.cyan));
  }

  console.log('\n----------------------------------------------------------------\n');

  // -------------------------------------------------------------
  // STEP 7: Completed!
  // -------------------------------------------------------------
  console.log(color('🎉   S E T U P   C O M P L E T E D   🎉', C.bold + C.green));
  console.log('\nCongratulations! Your family booking calendar is configured.\n');
  
  console.log(`${color('★ How to run locally:', C.bold + C.yellow)}`);
  console.log(`  Start the local development server:`);
  console.log(`    ${color('npm run dev', C.cyan)}`);
  console.log(`  Then open ${color('http://localhost:3000', C.underline + C.cyan)} in your browser.\n`);

  console.log(`${color('★ How to deploy online:', C.bold + C.yellow)}`);
  console.log(`  1. Commit your changes:`);
  console.log(`     ${color('git add .env.local scripts/setup.js && git commit -m "Configure family calendar"', C.gray)}`);
  console.log(`     (Note: .env.local is ignored in .gitignore, keeping your secrets perfectly safe!)`);
  console.log(`  2. Push to your GitHub repository:`);
  console.log(`     ${color('git push', C.cyan)}`);
  console.log(`  Vercel will detect the push and automatically deploy your live calendar!\n`);

  console.log(`${color('★ Managing the database:', C.bold + C.yellow)}`);
  console.log(`  You can open the Drizzle Studio visual manager at any time:`);
  console.log(`    ${color('npm run db:studio', C.cyan)}\n`);

  console.log(color('================================================================', C.cyan));
  console.log('Enjoy your family booking calendar!');
  console.log(color('================================================================', C.cyan));

  rl.close();
}

main().catch(err => {
  console.error(color('\nAn error occurred during setup:', C.red), err);
  rl.close();
});
