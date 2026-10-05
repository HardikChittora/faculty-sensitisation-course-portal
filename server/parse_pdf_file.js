import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { dbManager } from './db/db.js';

const pdfPath = 'C:\\Users\\Aaryan Shah\\.gemini\\antigravity\\brain\\338c7802-7b3c-46ae-b9cb-e31476be260c\\.user_uploaded\\media_1791206135303.pdf';

const DEPT_MAP = {
  'aero': 'Aerospace Engineering', 'ae': 'Aerospace Engineering',
  'ag': 'Agricultural & Food Engineering', 'agfe': 'Agricultural & Food Engineering',
  'arp': 'Architecture & Regional Planning', 'ar': 'Architecture & Regional Planning',
  'bt': 'Bioscience & Biotechnology', 'ce': 'Civil Engineering', 'civ': 'Civil Engineering',
  'civil': 'Civil Engineering', 'ch': 'Chemical Engineering', 'che': 'Chemical Engineering',
  'chem': 'Chemistry', 'chy': 'Chemistry', 'cs': 'Computer Science & Engineering',
  'cse': 'Computer Science & Engineering', 'ee': 'Electrical Engineering',
  'ece': 'Electronics & Electrical Communication', 'ec': 'Electronics & Electrical Communication',
  'gg': 'Geology & Geophysics', 'hs': 'Humanities & Social Sciences',
  'hss': 'Humanities & Social Sciences', 'ie': 'Industrial & Systems Engineering',
  'iem': 'Industrial & Systems Engineering', 'ise': 'Industrial & Systems Engineering',
  'ma': 'Mathematics', 'math': 'Mathematics', 'maths': 'Mathematics', 'mat': 'Mathematics',
  'me': 'Mechanical Engineering', 'mech': 'Mechanical Engineering',
  'met': 'Metallurgical & Materials Engineering', 'metal': 'Metallurgical & Materials Engineering',
  'mme': 'Metallurgical & Materials Engineering', 'mt': 'Metallurgical & Materials Engineering',
  'mi': 'Mining Engineering', 'mining': 'Mining Engineering', 'min': 'Mining Engineering',
  'na': 'Ocean Engineering & Naval Architecture', 'naval': 'Ocean Engineering & Naval Architecture',
  'ph': 'Physics', 'phy': 'Physics', 'atdc': 'Advanced Technology Development Centre',
  'cet': 'Centre for Educational Technology', 'cryo': 'Cryogenic Engineering Centre',
  'matsc': 'Materials Science Centre', 'ms': 'Materials Science Centre',
  'rtc': 'Rubber Technology Centre', 'rt': 'Rubber Technology Centre',
  'rgsoipl': 'Rajiv Gandhi School of IP Law', 'law': 'Rajiv Gandhi School of IP Law',
  'vgsom': 'Vinod Gupta School of Management', 'som': 'Vinod Gupta School of Management',
  'smst': 'School of Medical Science & Technology', 'gssst': 'G S Sanyal School of Telecommunications',
  'coral': 'CORAL', 'coesea': 'Safety Engineering & Analytics',
  'swr': 'School of Water Resources', 'water': 'School of Water Resources',
  'iks': 'Indian Knowledge Systems', 'ai': 'Artificial Intelligence', 'cai': 'Artificial Intelligence',
  'see': 'Energy Science & Engineering', 'es': 'Energy Science & Engineering',
  'nano': 'Nanoscience & Technology'
};

async function parseAndSeed() {
  await dbManager.ready();
  await dbManager.pool.query("DELETE FROM users WHERE role = 'faculty'");
  console.log("Wiped old faculty data.");

  let dataBuffer = fs.readFileSync(pdfPath);
  let data = await pdf(dataBuffer);
  const lines = data.text.split('\n');

  const facultyMembers = {};

  for (let line of lines) {
    if (!line.includes('@')) continue;

    // The name is usually at the start of the line. Remove hindi words.
    line = line.replace(/[\u0900-\u097F]/g, '');
    
    // Squeeze spaces for email detection
    const spaceless = line.replace(/\s+/g, '');
    
    // E.g. dkmaiti@aeroA-173 -> user: dkmaiti, domainRest: aeroA-173
    // E.g. amishra@agfeB-160 -> user: amishra, domainRest: agfeB-160
    const emailMatch = spaceless.match(/([a-zA-Z0-9_.-]+)@([a-zA-Z]+)/);
    if (!emailMatch) continue;

    const rawUser = emailMatch[1].toLowerCase();
    const domainRest = emailMatch[2].toLowerCase();

    // Since numbers were removed from user part, if user part is empty or just dots, skip
    // Let's rely on space splitting for the name, and fallback.
    // The name usually has 1 to 3 words at the beginning of the line.
    const words = line.trim().split(/\s+/);
    let nameParts = [];
    for (const w of words) {
        if (/^[A-Za-z.]+$/.test(w)) {
            nameParts.push(w);
        } else {
            break; // hit a number or something
        }
    }
    
    let name = nameParts.join(' ').replace(/Office|Head|Email|Room|Lab|Dean|Prof|Asso|Asst/gi, '').trim();
    if (name.length < 3 || name.toLowerCase().includes('dean') || name.toLowerCase().includes('warden')) continue;

    // Now extract the department code from domainRest
    let deptCode = null;
    let deptName = null;
    
    // Check if it's name.deptcode@iitkgp.ac.in
    if (domainRest === 'iitkgp' || domainRest === 'iitkgpac' || domainRest === 'ac' || domainRest === 'iitkgpacin') {
        const parts = rawUser.split('.');
        if (parts.length > 1) {
            const potentialCode = parts[parts.length - 1];
            if (DEPT_MAP[potentialCode]) {
                deptCode = potentialCode;
                deptName = DEPT_MAP[potentialCode];
            }
        }
    }

    if (!deptCode) {
        for (const code of Object.keys(DEPT_MAP)) {
            if (domainRest === code || domainRest.startsWith(code + 'a') || domainRest.startsWith(code + 'b') || 
                domainRest.startsWith(code + 'c') || domainRest.startsWith(code + 'd') || 
                domainRest.startsWith(code + 'e') || domainRest.startsWith(code + 'f') ||
                domainRest.startsWith(code + 'n') || domainRest.startsWith(code + 'm') ||
                domainRest.startsWith(code + 's') || domainRest.startsWith(code + '-')) {
                if (domainRest.startsWith(code)) {
                    deptCode = code;
                    deptName = DEPT_MAP[code];
                    break;
                }
            }
        }
    }

    if (!deptCode) continue;

    // Clean user part:
    // If rawUser has a huge string of numbers (phone), strip it.
    let userPartClean = rawUser.replace(/^.*\d{5,}/, ''); 
    if (!userPartClean) userPartClean = rawUser;

    // If we extracted deptCode from userPart (e.g. name.cai), remove .cai so it doesn't become name.cai@cai...
    if (userPartClean.endsWith('.' + deptCode)) {
        userPartClean = userPartClean.substring(0, userPartClean.length - deptCode.length - 1);
    }

    const email = `${userPartClean}@${deptCode}.iitkgp.ac.in`;
    const id = userPartClean;

    facultyMembers[email] = { id, name, email, department: deptName };
  }

  const values = Object.values(facultyMembers);
  console.log(`Found ${values.length} purely academic faculty members.`);

  let count = 0;
  for (const f of values) {
    try {
      await dbManager.pool.query(
        `INSERT INTO users (id, email, name, department, role, status)
         VALUES ($1, $2, $3, $4, $5, 'not_enrolled')
         ON CONFLICT (email) DO UPDATE SET 
           name = EXCLUDED.name, 
           department = EXCLUDED.department,
           id = EXCLUDED.id`,
        [f.id, f.email, f.name, f.department, 'faculty']
      );
      count++;
    } catch (err) {
      // ignore duplicates
    }
  }
  
  console.log(`Seeded ${count} purely academic faculty members.`);
  process.exit(0);
}

parseAndSeed();
