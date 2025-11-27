const { ethers } = require('ethers');

async function test() {
  const wallet = ethers.Wallet.createRandom();
  
  // Login
  const { nonce, message } = await fetch(`http://localhost:3000/auth/challenge?walletAddress=${wallet.address}`).then(r => r.json());
  const signature = await wallet.signMessage(message);
  
  const loginData = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: wallet.address,
      signature,
      nonce,
      username: 'TestLand',
      network: 'sui'
    })
  }).then(r => r.json());
  
  console.log('✅ Login Response:');
  console.log(JSON.stringify(loginData, null, 2));
  
  // Check profile
  const profile = await fetch('http://localhost:3000/user/profile', {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  }).then(r => r.json());
  
  console.log('\n📋 Profile with lands count:');
  console.log(JSON.stringify(profile, null, 2));
}

test().catch(console.error);
