// Use global fetch available in Node.js 18+
// If not available, we'll use a different approach

async function testRateLimit() {
  console.log('Testing rate limiting on /api/generate...\n');
  
  const url = 'http://localhost:3000/api/generate';
  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': '192.168.1.100' // Simulate a specific IP
  };
  
  const body = JSON.stringify({
    idea: 'A beautiful sunset over mountains'
  });

  for (let i = 1; i <= 7; i++) {
    try {
      console.log(`Request ${i}:`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });
      
      const data = await response.json();
      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`);
      console.log('');
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('Testing rate limiting on /api/surprise...\n');
  
  const surpriseUrl = 'http://localhost:3000/api/surprise';
  
  for (let i = 1; i <= 7; i++) {
    try {
      console.log(`Surprise Request ${i}:`);
      const response = await fetch(surpriseUrl, {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.101' // Different IP for surprise endpoint
        }
      });
      
      const data = await response.json();
      console.log(`  Status: ${response.status}`);
      console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`);
      console.log('');
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      console.log('');
    }
  }
}

testRateLimit().catch(console.error);
