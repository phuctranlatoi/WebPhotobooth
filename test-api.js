const authHeader = 'Bearer booth_1_secret_key';
const url = 'https://web-photobooth-phuctranlatois-projects.vercel.app/api/v1/albums';
const body = {
  externalSessionId: 'test-session-' + Date.now(),
  expectedAssets: 2,
  expiresInDays: 7
};

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(console.log)
.catch(console.error);
