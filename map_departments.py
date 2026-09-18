import json

department_map = {
    'aero': 'Aerospace Engineering',
    'ae': 'Aerospace Engineering',
    'ag': 'Agricultural and Food Engineering',
    'agfe': 'Agricultural and Food Engineering',
    'arp': 'Architecture and Regional Planning',
    'ar': 'Architecture and Regional Planning',
    'bt': 'Biotechnology',
    'ce': 'Civil Engineering',
    'civ': 'Civil Engineering',
    'civil': 'Civil Engineering',
    'ch': 'Chemical Engineering',
    'che': 'Chemical Engineering',
    'chem': 'Chemistry',
    'cs': 'Computer Science and Engineering',
    'cse': 'Computer Science and Engineering',
    'ee': 'Electrical Engineering',
    'ece': 'Electronics and Electrical Communication',
    'gg': 'Geology and Geophysics',
    'hs': 'Humanities and Social Sciences',
    'hss': 'Humanities and Social Sciences',
    'ie': 'Industrial and Systems Engineering',
    'iem': 'Industrial and Systems Engineering',
    'ma': 'Mathematics',
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'mat': 'Mathematics',
    'me': 'Mechanical Engineering',
    'mech': 'Mechanical Engineering',
    'met': 'Metallurgical and Materials Engineering',
    'metal': 'Metallurgical and Materials Engineering',
    'mi': 'Mining Engineering',
    'mining': 'Mining Engineering',
    'na': 'Ocean Engineering and Naval Architecture',
    'naval': 'Ocean Engineering and Naval Architecture',
    'ph': 'Physics',
    'phy': 'Physics',
    'atdc': 'Advanced Technology Development Centre',
    'cet': 'Centre for Educational Technology',
    'cryo': 'Cryogenic Engineering Centre',
    'matsc': 'Materials Science Centre',
    'rtc': 'Rubber Technology Centre',
    'rgsoipl': 'Rajiv Gandhi School of IP Law',
    'rg': 'Rajiv Gandhi School of IP Law',
    'vgsom': 'Vinod Gupta School of Management',
    'vg': 'Vinod Gupta School of Management',
    'smst': 'School of Medical Science and Technology',
    'gssst': 'G S Sanyal School of Telecommunications',
    'coral': 'CORAL',
    'coesea': 'Center of Excellence in Safety Engineering and Analytics',
    'swr': 'School of Water Resources',
    'iks': 'Indian Knowledge Systems',
    'cai': 'Centre of Artificial Intelligence',
    'ai': 'Centre of Artificial Intelligence',
    'bcrmrc': 'B C Roy Multi Speciality Research Centre',
    'see': 'School of Energy Science and Engineering',
    'edu': 'Centre of Educational Technology',
    'ii': 'Centre for Indian Knowledge Systems',
    'ci': 'Centre for Indian Knowledge Systems',
    'coeah': 'Centre of Excellence in Art and Heritage',
    'sit': 'School of Information Technology',
    'spmsh': 'Subir Chowdhury School of Quality and Reliability',
    'co': 'Centre of Excellence'
}

with open('src/services/mock_faculty.json', 'r') as f:
    data = json.load(f)

for d in data:
    email = d.get('email', '')
    if '@' in email:
        domain = email.split('@')[1]
        depcode = domain.split('.')[0].lower()
        if depcode in department_map:
            d['department'] = department_map[depcode]
        else:
            d['department'] = depcode.upper() + ' Department'

with open('src/services/mock_faculty.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Department mapping complete.")
