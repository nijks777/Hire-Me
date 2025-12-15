// Quick test script - run in browser console
// Copy your JWT token first: localStorage.getItem('access_token')

const token = 'PASTE_YOUR_TOKEN_HERE';

fetch('http://localhost:8000/api/resume/get', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('Resume API Response:', data);
  if (data.resume) {
    console.log('✅ Resume found:', data.resume.fileName);
  } else {
    console.log('❌ No resume in response');
  }
})
.catch(err => console.error('Error:', err));
