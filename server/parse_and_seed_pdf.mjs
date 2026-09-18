// Parse comdir.pdf to extract professors department-wise and insert into DB
// Run: node server/parse_and_seed_pdf.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbManager } from './db/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, '../comdir.pdf');

async function extractAndSeed() {
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync(PDF_PATH);
  const pdfData = await pdfParse(dataBuffer);

  console.log(`PDF has ${pdfData.numpages} pages, text length: ${pdfData.text.length}`);
  
  // Save raw text for inspection
  fs.writeFileSync(path.join(__dirname, '../pdf_raw.txt'), pdfData.text, 'utf8');
  console.log('Raw text saved to pdf_raw.txt for inspection');

  // Parse text into faculty list
  const lines = pdfData.text.split('\n').map(l => l.trim()).filter(Boolean);
  
  const facultyList = [];
  let currentDept = 'Faculty';
  
  // Regex patterns for email and department detection
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
  
  // Known IIT KGP department keywords
  const deptKeywords = [
    'Engineering', 'Sciences', 'Technology', 'Management', 'Humanities',
    'Architecture', 'Design', 'Mathematics', 'Physics', 'Chemistry',
    'Biology', 'Economics', 'Planning', 'School', 'Centre', 'Studies'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this looks like a department header
    // Usually: a line with English department keywords, no email, not too long
    if (!emailRegex.test(line)) {
      const hasDeptkw = deptKeywords.some(kw => line.includes(kw));
      if (hasDeptkw && line.length < 120 && line.length > 5) {
        // Extract the English portion as department name
        const engPart = line.match(/[A-Za-z &,().&\-\/]+/g)?.join('').trim();
        if (engPart && engPart.length > 4) {
          currentDept = engPart.replace(/\s+/g, ' ').trim();
          console.log('Dept:', currentDept);
        }
        continue;
      }
    }

    // Look for lines with email addresses (faculty rows)
    const emailMatch = line.match(emailRegex);
    if (emailMatch) {
      let email = emailMatch[0];
      
      // Ensure full email format
      if (!email.includes('.ac.in') && !email.includes('.edu') && !email.includes('.com')) {
        email = email + '.iitkgp.ac.in';
      }
      
      // Extract name: look for "Prof. Name" or "Dr. Name" or just capitalized names
      // In IIT KGP comdir, format is usually:
      // Hindi Name  English Name  Ext  Phone  email  designation
      // Extract English name part before the email match
      const beforeEmail = line.substring(0, line.indexOf(emailMatch[0])).trim();
      
      // Find the English name: consecutive capitalized-start words
      const nameMatches = beforeEmail.match(/(?:[A-Z][a-z]+\.?\s*)+/g);
      let name = '';
      if (nameMatches && nameMatches.length > 0) {
        // Take the longest name-looking match
        name = nameMatches.reduce((a, b) => a.length >= b.length ? a : b).trim();
      }

      if (!name) {
        // fallback: use email prefix
        name = email.split('@')[0].replace(/[._]/g, ' ')
          .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }

      // Generate a unique ID from email
      const id = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      if (id && email && name) {
        facultyList.push({ id, name: name.trim(), email: email.toLowerCase(), department: currentDept });
      }
    }
  }

  console.log(`\nExtracted ${facultyList.length} faculty members.`);
  
  // Deduplicate by email
  const unique = {};
  for (const f of facultyList) {
    if (!unique[f.email]) unique[f.email] = f;
  }
  const uniqueList = Object.values(unique);
  console.log(`Unique by email: ${uniqueList.length}`);

  // Save JSON for the frontend mock fallback
  const jsonPath = path.join(__dirname, '../src/services/mock_faculty.json');
  fs.writeFileSync(jsonPath, JSON.stringify(uniqueList, null, 2), 'utf8');
  console.log(`Saved ${uniqueList.length} faculty to src/services/mock_faculty.json`);

  // Insert into DB
  await dbManager.ready();
  if (!dbManager.usePostgres) {
    console.log('⚠️  DB not connected — only JSON file was generated.');
    process.exit(0);
  }

  let inserted = 0, failed = 0;
  for (const f of uniqueList) {
    try {
      await dbManager.pool.query(
        `INSERT INTO users (id, email, name, department, role)
         VALUES ($1, $2, $3, $4, 'faculty')
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           department = EXCLUDED.department`,
        [f.id, f.email, f.name, f.department]
      );
      // Initialize progress rows for the faculty member
      await dbManager.pool.query(
        `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
         VALUES 
           ($1, 'c1-m1', true,  false, false, 0),
           ($1, 'c1-m2', false, false, false, 0),
           ($1, 'c1-m3', false, false, false, 0)
         ON CONFLICT (user_id, module_id) DO NOTHING`,
        [f.id]
      );
      inserted++;
    } catch (err) {
      console.error(`Failed: ${f.email} — ${err.message}`);
      failed++;
    }
    if ((inserted + failed) % 100 === 0) {
      console.log(`Progress: ${inserted} inserted, ${failed} failed`);
    }
  }

  console.log(`\n✅  Done! ${inserted} inserted, ${failed} failed.`);
  process.exit(0);
}

extractAndSeed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
