import fs from 'fs';
import readline from 'readline';
import { dbManager } from './db/db.js';

const transcriptPath = 'C:\\Users\\Aaryan Shah\\.gemini\\antigravity-ide\\brain\\a8a567cb-1dfa-4d0f-a729-dc87008577e6\\.system_generated\\logs\\transcript_full.jsonl';

async function seedProfessors() {
  await dbManager.ready();
  if (!dbManager.usePostgres) {
    console.log('Postgres is not connected');
    return;
  }

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let promptContent = '';
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content.includes('==Start of OCR for page')) {
        promptContent = obj.content;
      }
    } catch (e) {
      // ignore parse errors for a line
    }
  }

  if (!promptContent) {
    console.log('Could not find OCR data in transcript');
    process.exit(1);
  }

  const lines = promptContent.split('\n');
  let currentDept = 'Faculty';
  const facultyMembers = [];

  for (const line of lines) {
    // Check if it's a department line, they usually contain English words and maybe "Engineering" or "Science"
    // Also "Faculty of" or "Department of" but let's just look at the format
    // Example: "वांतररक्ष अनिर्ांनिकी Aerospace Engineering"
    // Example: "कृनष एवंखाद्य अनिर्ांनिकी Agricultural & Food Engineering"
    // We can extract the english part.
    if (line.match(/[A-Za-z]{3,}/) && !line.includes('@') && !line.match(/\d{4}/) && !line.includes('Head') && !line.includes('Office') && line.length < 80) {
       // it might be a department. Let's extract the English part
       const engMatch = line.match(/[A-Za-z &,-]+/g);
       if (engMatch) {
         const possibleDept = engMatch.join('').trim();
         if (possibleDept.length > 5 && !possibleDept.includes('==')) {
           currentDept = possibleDept;
         }
       }
    }

    // Check if it's a professor line.
    // Example: "भट्टाचार्ण एस Bhattacharyya S 84504 60465 susmita@aero FTA-10"
    // "चक्रवर्ती पी Chakraborty P"
    // Contains English name, maybe email.
    
    // Let's extract the email if it exists
    const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+/);
    let email = null;
    if (emailMatch) {
      email = emailMatch[0];
    }
    
    // Let's extract the name. The name is usually the first continuous sequence of English words.
    // E.g., "Bhattacharyya S"
    const nameMatch = line.match(/[A-Z][a-z]+(?: [A-Z][a-z]*){0,2}/);
    let name = null;
    if (nameMatch) {
      name = nameMatch[0];
    } else {
      // Sometimes just uppercase or single letters
      const altNameMatch = line.match(/[A-Z][a-z]+(?: [A-Z])+/);
      if (altNameMatch) name = altNameMatch[0];
    }

    if (name && (email || line.match(/[A-Z][a-z]+ [A-Z]/))) {
      // It's likely a professor
      if (!email) {
         // Fake email based on name
         email = name.replace(/ /g, '.').toLowerCase() + '@iitkgp.ac.in';
      }
      if (!email.includes('iitkgp.ac.in')) {
         if (email.endsWith('@')) email += 'iitkgp.ac.in';
         else if (email.endsWith('@aero') || email.endsWith('@agfe') || email.endsWith('@maths')) email += '.iitkgp.ac.in'; // simplistic
      }
      
      const id = email.split('@')[0];
      facultyMembers.push({ id, name, email, department: currentDept });
    }
  }

  console.log(`Found ${facultyMembers.length} potential faculty members.`);
  
  // Deduplicate by ID
  const uniqueFaculty = {};
  for (const f of facultyMembers) {
    uniqueFaculty[f.id] = f;
  }

  let count = 0;
  for (const id in uniqueFaculty) {
    const f = uniqueFaculty[id];
    try {
      await dbManager.pool.query(
        `INSERT INTO users (id, email, name, department, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name, 
           department = EXCLUDED.department`,
        [f.id, f.email, f.name, f.department, 'faculty']
      );
      count++;
      if (count % 100 === 0) console.log(`Inserted ${count} records...`);
    } catch (err) {
      console.error('Error inserting', f.email, err.message);
    }
  }

  console.log(`Successfully seeded ${count} faculty members.`);
  process.exit(0);
}

seedProfessors();
