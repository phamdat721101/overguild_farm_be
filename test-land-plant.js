const { ethers } = require('ethers');

async function test() {
  console.log('🧪 Testing Land & Plant System\n');
  
  const wallet = ethers.Wallet.createRandom();
  console.log('🔑 Wallet:', wallet.address);
  
  // 1. Get challenge
  const { nonce, message } = await fetch(
    `http://localhost:3000/auth/challenge?walletAddress=${wallet.address}`
  ).then(r => r.json());
  
  // 2. Sign & Login
  const signature = await wallet.signMessage(message);
  const loginData = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: wallet.address,
      signature,
      nonce,
      username: 'LandOwner',
      network: 'sui'
    })
  }).then(r => r.json());
  
  console.log('\n✅ Login Response:');
  console.log(JSON.stringify(loginData, null, 2));
  
  // 3. Get Profile
  const profile = await fetch('http://localhost:3000/user/profile', {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  }).then(r => r.json());
  
  console.log('\n📋 Profile:');
  console.log('- Username:', profile.username);
  console.log('- Network:', profile.network);
  console.log('- Lands:', profile.lands);
  console.log('- Counts:', profile._count);
  
  console.log('\n🎉 Expected:');
  console.log('  ✅ User has 1 land (plot 0)');
  console.log('  ✅ Land has 1 plant (stage: SEED)');
  console.log('  ✅ landsCount: 1, plantsCount: 1');
  console.log('  ✅ isNewUser: true');
}

test().catch(console.error);
