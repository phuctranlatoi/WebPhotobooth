const authHeader = 'Bearer booth_1_secret_key';
const baseUrl = 'https://web-photobooth-phuctranlatois-projects.vercel.app';
const body = {
  externalSessionId: 'test-session-' + Date.now(),
  expectedAssets: 1,
  expiresInDays: 7
};

async function run() {
  // 1. Create album
  const createRes = await fetch(`${baseUrl}/api/v1/albums`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const createData = await createRes.json();
  console.log('Create Album:', createRes.status, createData);
  
  if (createRes.status !== 201) return;
  const albumId = createData.albumId;

  // 2. Upload Signature
  const sigRes = await fetch(`${baseUrl}/api/v1/albums/${albumId}/upload-signature`, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'ORIGINAL',
      position: 0,
      format: 'jpg'
    })
  });
  
  const sigData = await sigRes.json();
  console.log('Upload Signature:', sigRes.status, sigData);
  
  if (sigRes.status !== 200) return;

  // 3. Complete Album
  const compRes = await fetch(`${baseUrl}/api/v1/albums/${albumId}/complete`, {
    method: 'POST',
    headers: { 'Authorization': authHeader }
  });
  
  const compData = await compRes.json();
  console.log('Complete Album:', compRes.status, compData);
}

run().catch(console.error);
