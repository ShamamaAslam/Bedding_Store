const url = 'https://bedding-store.onrender.com/api/products';
fetch(url)
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(res => console.log('Diagnostic Result:', JSON.stringify(res, null, 2)))
  .catch(err => console.error('Fetch Error:', err));
