// Parse comdir.pdf - IIT KGP Communication Directory
// Format per row: HindiName EnglishName OffExt [ResExt] email@dept [QuarterNo]
// Email like "susmita@aero" → "susmita@aero.iitkgp.ac.in"
// Run: node server/parse_cjs.cjs

const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '../comdir.pdf');

async function extractAllText() {
  const buf = fs.readFileSync(pdfPath);
  const uint8 = new Uint8Array(buf);
  const parser = new PDFParse({ verbosity: -1, data: uint8 });
  await parser.load();
  const doc = parser.doc;
  const numPages = doc.numPages || 102;
  console.log('Pages:', numPages);

  let fullText = '';
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `\n---PAGE ${pageNum}---\n` + pageText;
      if (pageNum % 10 === 0) process.stdout.write(`\r  Page ${pageNum}/${numPages}...`);
    } catch (e) {
      console.error(`\nPage ${pageNum}:`, e.message);
    }
  }
  console.log('\nDone extracting.');
  return fullText;
}

function parseFacultyFromText(text) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  const facultyList = [];
  let currentDept = 'General';

  // Patterns for IIT KGP department sections
  // Dept headers appear as English department name lines (no email, no numbers only)
  const knownDepts = [
    { key: 'Aerospace Engineering', label: 'Aerospace Engineering' },
    { key: 'Agricultural & Food Engineering', label: 'Agricultural & Food Engineering' },
    { key: 'Architecture & Regional Planning', label: 'Architecture & Regional Planning' },
    { key: 'Artificial Intelligence', label: 'Artificial Intelligence' },
    { key: 'Chemical Engineering', label: 'Chemical Engineering' },
    { key: 'Chemistry', label: 'Chemistry' },
    { key: 'Civil Engineering', label: 'Civil Engineering' },
    { key: 'Computer Science & Engineering', label: 'Computer Science & Engineering' },
    { key: 'Electrical Engineering', label: 'Electrical Engineering' },
    { key: 'Electronics & Electrical Communication Engineering', label: 'Electronics & ECE' },
    { key: 'Energy Science & Engineering', label: 'Energy Science & Engineering' },
    { key: 'Environmental Science', label: 'Environmental Science & Engineering' },
    { key: 'G S Sanyal School of Telecommunication', label: 'G S Sanyal School of Telecomm.' },
    { key: 'Mechanical Engineering', label: 'Mechanical Engineering' },
    { key: 'Metallurgical & Materials Engineering', label: 'Metallurgical & Materials Engg.' },
    { key: 'Mining Engineering', label: 'Mining Engineering' },
    { key: 'Ocean Engineering & Naval Architecture', label: 'Ocean Engg. & Naval Architecture' },
    { key: 'Ranbir and Chitra Gupta School', label: 'School of Infrastructure Design & Mgmt' },
    { key: 'Rubber Technology', label: 'Rubber Technology' },
    { key: 'School of Water Resources', label: 'School of Water Resources' },
    { key: 'Steel Technology Centre', label: 'Steel Technology Centre' },
    { key: 'Subir Chowdhury School', label: 'Subir Chowdhury School of Quality & Reliability' },
    { key: 'Bioscience and Biotechnology', label: 'Bioscience & Biotechnology' },
    { key: 'Cryogenic Engineering', label: 'Cryogenic Engineering' },
    { key: 'Industrial & Systems Engineering', label: 'Industrial & Systems Engineering' },
    { key: 'Centre for Computational and Data Sciences', label: 'CCDS' },
    { key: 'Centre for Railway Research', label: 'Centre for Railway Research' },
    { key: 'Nanoscience & Technology', label: 'Nanoscience & Technology' },
    { key: 'Materials Science', label: 'Materials Science' },
    { key: 'Centre for Ocean, River', label: 'Centre for Ocean, River, Atmosphere & Land Sc.' },
    { key: 'Geology & Geophysics', label: 'Geology & Geophysics' },
    { key: 'Mathematics', label: 'Mathematics' },
    { key: 'Physics', label: 'Physics' },
    { key: 'Education', label: 'Education' },
    { key: 'Humanities & Social Sciences', label: 'Humanities & Social Sciences' },
    { key: 'Rajiv Gandhi School of Intellectual Property', label: 'Rajiv Gandhi School of IP Law' },
    { key: 'Vinod Gupta School of Management', label: 'Vinod Gupta School of Management' },
    { key: 'School of Medical Science', label: 'School of Medical Science & Technology' },
    { key: 'Rajendra Mishra School', label: 'Rajendra Mishra School of Engg. Entrepreneurship' },
    { key: 'Partha Ghosh', label: 'Partha Ghosh School of Leadership' },
    { key: 'P K Sinha Centre', label: 'P K Sinha Centre for Bio Energy & Renewables' },
  ];

  // Email regex - matches partial emails like "susmita@aero" or full emails
  const emailPattern = /([a-zA-Z0-9][a-zA-Z0-9._+\-]*@[a-zA-Z0-9._\-]+)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for department header
    for (const dept of knownDepts) {
      if (line.includes(dept.key)) {
        currentDept = dept.label;
        break;
      }
    }

    // Look for email patterns in line
    const emailMatches = [...line.matchAll(emailPattern)];
    if (emailMatches.length === 0) continue;

    for (const emailMatch of emailMatches) {
      let emailRaw = emailMatch[1];

      // Skip common non-faculty emails
      if (/^(office|head|hod|secretary|registrar|director|fax|sectnr|admin|info|contact|academic|admissions|store|canteen|mess|exam|gate|jee)/.test(emailRaw.toLowerCase())) {
        continue;
      }

      // Complete partial emails: "user@dept" → "user@dept.iitkgp.ac.in"
      let email = emailRaw.toLowerCase();
      if (!email.includes('.')) {
        email = email + '.iitkgp.ac.in';
      } else if (!email.includes('.ac.in') && !email.includes('.edu') && !email.includes('.com')) {
        // Like "user@dept.something" - append iitkgp.ac.in
        const parts = email.split('@');
        const domain = parts[1];
        if (!domain.includes('.')) {
          email = parts[0] + '@' + domain + '.iitkgp.ac.in';
        }
      }

      // Extract English name from line - look for "Lastname Firstname" pattern
      // In IIT KGP directory the English name is typically "Surname Initial" e.g. "Bhattacharyya S"
      const beforeEmail = line.substring(0, line.indexOf(emailRaw)).trim();
      
      // Find English name: match sequences of capitalized English words (Last First)
      // Usually 1-3 words, ending before the phone numbers
      const namePatterns = beforeEmail.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)(?:\s+[A-Z]{1,2}(?:\s+[A-Z]{1,2})*)?/g);
      let name = '';
      if (namePatterns && namePatterns.length > 0) {
        // Take the longest name match that is not just "Office" or "Head"
        const validNames = namePatterns.filter(n => 
          n.length > 2 && 
          !['Office', 'Head', 'Faculty', 'Room', 'Lab', 'Lab ', 'Centre', 'Department'].includes(n.trim())
        );
        if (validNames.length > 0) {
          name = validNames[validNames.length - 1].trim();
        }
      }

      if (!name || name.length < 2) {
        // Fallback: use email prefix
        name = email.split('@')[0]
          .replace(/[._\-]/g, ' ')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      // Clean name: remove trailing numbers and single chars
      name = name.replace(/\s+\d+.*$/, '').trim();

      const id = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '');

      if (id && email && name && id.length > 1) {
        facultyList.push({ id, name, email, department: currentDept });
      }
    }
  }

  // Deduplicate by email (keep first occurrence per email)
  const seen = new Set();
  const unique = facultyList.filter(f => {
    if (seen.has(f.email)) return false;
    seen.add(f.email);
    return true;
  });

  return unique;
}

async function seedDB(facultyList) {
  const { dbManager } = await import('./db/db.js');
  await dbManager.ready();

  if (!dbManager.usePostgres) {
    console.log('⚠️  DB not connected.');
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0, skipped = 0;
  for (const f of facultyList) {
    try {
      await dbManager.pool.query(
        `INSERT INTO users (id, email, name, department, role)
         VALUES ($1, $2, $3, $4, 'faculty')
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           department = EXCLUDED.department`,
        [f.id, f.email, f.name, f.department]
      );
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
      console.error(`  Failed: ${f.email} — ${err.message}`);
      skipped++;
    }
    if ((inserted + skipped) % 100 === 0) {
      process.stdout.write(`\r  ${inserted} inserted, ${skipped} failed...`);
    }
  }
  return { inserted, skipped };
}

async function main() {
  console.log('=== IIT KGP Faculty Directory Parser ===\n');
  const text = await extractAllText();

  const rawPath = path.join(__dirname, '../pdf_raw.txt');
  fs.writeFileSync(rawPath, text, 'utf8');
  console.log('Raw text saved → pdf_raw.txt\n');

  console.log('Parsing faculty records...');
  const faculty = parseFacultyFromText(text);
  console.log(`Extracted ${faculty.length} unique faculty members.\n`);

  // Show sample
  console.log('Sample (first 20):');
  faculty.slice(0, 20).forEach(f => console.log(`  ${f.name.padEnd(30)} ${f.email.padEnd(40)} ${f.department}`));

  // Department summary
  const byDept = {};
  faculty.forEach(f => { byDept[f.department] = (byDept[f.department] || 0) + 1; });
  console.log('\nBy department:');
  Object.entries(byDept).sort((a,b) => b[1] - a[1]).forEach(([d, n]) => console.log(`  ${n.toString().padStart(3)}  ${d}`));

  // Save JSON for frontend
  const jsonPath = path.join(__dirname, '../src/services/mock_faculty.json');
  fs.writeFileSync(jsonPath, JSON.stringify(faculty, null, 2), 'utf8');
  console.log(`\nSaved ${faculty.length} faculty → src/services/mock_faculty.json`);

  // Seed DB
  console.log('\nSeeding into PostgreSQL...');
  const { inserted, skipped } = await seedDB(faculty);
  console.log(`\n✅  Done! ${inserted} inserted, ${skipped} failed.`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
