import fs from 'fs';
import { dbManager } from './db/db.js';

async function parseAndSeed() {
  await dbManager.ready();
  
  const content = fs.readFileSync('latest_prompt.json', 'utf8');
  let lines = [];
  try {
    const obj = JSON.parse(content.trim());
    const contentStr = Array.isArray(obj.content) ? obj.content.map(p => p.text || '').join('\n') : obj.content;
    lines = contentStr.split('\n');
    console.log(`Parsed JSON successfully. Found ${lines.length} lines.`);
  } catch(e) {
    console.log("Failed to parse JSON:", e.message);
    process.exit(1);
  }

  let currentDept = 'Faculty';
  const facultyMembers = [];

  for (const line of lines) {
    if (!line.includes('@')) {
      if (line.match(/[A-Za-z]{5,}/) && !line.match(/\d{4}/) && !line.includes('Head') && !line.includes('Office') && line.length < 100) {
         const engMatch = line.match(/[A-Za-z &,-]+/g);
         if (engMatch) {
           const possibleDept = engMatch.join('').replace(/append|iitkgp|with|Email|Qtr No|Res|Office/ig, '').trim();
           if (possibleDept.length > 5 && !possibleDept.includes('==')) {
             currentDept = possibleDept;
           }
         }
      }
    }

    const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+/);
    
    let name = null;
    const nameRegex = /([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]*){0,3})/;
    const matches = line.match(new RegExp(nameRegex, 'g'));
    if (matches) {
       for (const m of matches) {
          if (!['Office', 'Head', 'Email', 'Room', 'Lab', 'Dean', 'Prof', 'Asso', 'Asst'].includes(m.trim()) && m.trim().length > 2) {
             name = m.trim();
             break;
          }
       }
    }

    let email = null;
    if (emailMatch) email = emailMatch[0];

    if (name && (email || line.includes('@'))) {
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

  const unique = {};
  for (const f of facultyMembers) {
    unique[f.email] = f;
  }

  const values = Object.values(unique);
  console.log(`Found ${values.length} unique faculty members.`);

  let count = 0;
  for (const f of values) {
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
      console.log(err.message);
    }
  }
  
  console.log(`Seeded ${count} faculty members.`);
  process.exit(0);
}

parseAndSeed();
