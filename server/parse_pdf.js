import fs from 'fs';

async function parseAndSeed() {
  const content = fs.readFileSync('pdf_raw.txt', 'utf8');
  const lines = content.split('\n');
  
  let currentDept = 'Faculty';
  const facultyMembers = [];

  for (const line of lines) {
    if (!line.includes('@')) {
      // Possible department
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
    
    // In pdf_raw.txt, lines with names look like:
    // Chakraborty M   ????????? ??   CHE   83932   8 3933   monojit@che   BF - 4/15
    // So the English name is at the start!
    // Or it might be: `????????? ??   Chakraborty M   CHE ...` depending on the column order.
    // Let's extract the longest sequence of English words at the start or near it.
    let name = null;
    const nameRegex = /([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]*){0,3})/;
    const matches = line.match(new RegExp(nameRegex, 'g'));
    if (matches) {
       // Usually the first valid name match is the name.
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

  console.log(`Found ${Object.keys(unique).length} unique faculty members.`);
  fs.writeFileSync('parsed_profs.json', JSON.stringify(Object.values(unique), null, 2));
}

parseAndSeed();
