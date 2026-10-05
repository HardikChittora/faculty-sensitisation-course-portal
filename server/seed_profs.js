import fs from 'fs';
import readline from 'readline';
import { dbManager } from './db/db.js';

const transcriptPath = 'C:\\Users\\Aaryan Shah\\.gemini\\antigravity\\brain\\338c7802-7b3c-46ae-b9cb-e31476be260c\\.system_generated\\logs\\transcript_full.jsonl';

async function parseAndSeed() {
  await dbManager.ready();

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let promptContent = '';
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.content && typeof obj.content === 'string' && obj.content.includes('==Start of OCR for page')) {
        promptContent = obj.content;
      }
    } catch (e) {}
  }

  if (!promptContent) {
    console.log('No OCR text found in transcript.');
    process.exit(1);
  }

  const lines = promptContent.split('\n');
  let currentDept = 'Faculty';
  const facultyMembers = [];

  for (const line of lines) {
    // Detect department
    if (line.match(/[A-Za-z]{5,}/) && !line.includes('@') && !line.match(/\d{4}/) && !line.includes('Head') && !line.includes('Office') && line.length < 80) {
       const engMatch = line.match(/[A-Za-z &,-]+/g);
       if (engMatch) {
         const possibleDept = engMatch.join('').trim();
         if (possibleDept.length > 5 && !possibleDept.includes('==')) {
           currentDept = possibleDept;
         }
       }
    }

    const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+/);
    
    // The format is usually: Hindi Name [English Name] [numbers] [email] [room]
    // Capture the continuous english name
    let name = null;
    const nameMatch = line.match(/([A-Z][a-zA-Z]+(?: [A-Z](?:[a-zA-Z]+)?)*)/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }

    let email = null;
    if (emailMatch) email = emailMatch[0];

    if (name && name !== 'Office' && name !== 'Head' && name !== 'Room' && name !== 'Lab' && name.length > 2) {
      if (email || line.match(/[A-Z][a-z]+ [A-Z]/)) {
        if (!email) {
           email = name.replace(/ /g, '.').toLowerCase() + '@iitkgp.ac.in';
        }
        if (!email.includes('iitkgp.ac.in')) {
           if (email.endsWith('@')) email += 'iitkgp.ac.in';
           else email += '.iitkgp.ac.in'; 
        }
        
        let id = email.split('@')[0];
        facultyMembers.push({ id, name, email, department: currentDept });
      }
    }
  }

  const unique = {};
  for (const f of facultyMembers) {
    unique[f.email] = f;
  }

  let count = 0;
  for (const email in unique) {
    const f = unique[email];
    try {
      await dbManager.pool.query(
        `INSERT INTO users (id, email, name, department, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET 
           name = EXCLUDED.name, 
           department = EXCLUDED.department,
           id = EXCLUDED.id`,
        [f.id, f.email, f.name, f.department, 'faculty']
      );
      count++;
    } catch (err) {
      // console.error('Error inserting', f.email, err.message);
    }
  }

  console.log(`Successfully seeded ${count} faculty members.`);
  process.exit(0);
}

parseAndSeed();
