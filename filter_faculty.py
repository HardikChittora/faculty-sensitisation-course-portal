import json

with open('src/services/mock_faculty.json', 'r') as f:
    data = json.load(f)

filtered = []
exclude_names = ["secretary", "dean", "office", "head", "asst", "username", "email", "director", "registrar", "president", "librarian", "medical", "engineer", "superintendent", "officer", "manager"]
exclude_emails = ["hijli", "adm.iitkgp", "secto", "username", "dean"]
exclude_domains = ["eoffice", "library", "ad", "sric", "iitkgp", "cc", "infra", "stf", "hij", "adm", "erp", "mail"]

for item in data:
    name = item.get('name', '').lower()
    email = item.get('email', '').lower()
    
    # Check if name contains excluded words
    if any(word in name for word in exclude_names):
        continue
        
    # Check if email contains excluded strings
    if any(string in email for string in exclude_emails):
        continue
        
    # Must have @ and end with iitkgp.ac.in
    if not ("@" in email and email.endswith(".iitkgp.ac.in")):
        continue
        
    domain = email.split('@')[1]
    depcode = domain.split('.')[0]
    
    # Exclude non-academic domains
    if depcode in exclude_domains:
        continue
        
    # Exclude single letter depcodes (likely OCR errors)
    if len(depcode) <= 1:
        continue

    # Skip generic emails
    if email.startswith('head@') or email.startswith('hod@') or email.startswith('office@') or email.startswith('admin@'):
        continue

    filtered.append(item)

print(f"Original: {len(data)}, Filtered: {len(filtered)}")

with open('src/services/mock_faculty.json', 'w') as f:
    json.dump(filtered, f, indent=2)
