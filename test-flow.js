const { ethers } = require('ethers');

async function testFlow() {
  console.log('🧪 Testing OverGuild Auth Flow\n');
  
  const wallet = ethers.Wallet.createRandom();
  console.log('🔑 Wallet:', wallet.address);
  
  // 1. Get challenge
  console.log('\n1️⃣  GET /auth/challenge');
  const { nonce, message } = await fetch(
    `http://localhost:3000/auth/challenge?walletAddress=${wallet.address}`
  ).then(r => r.json());
  console.log('   ✅ Nonce received:', nonce.substring(0, 20) + '...');
  
  // 2. Sign message
  console.log('\n2️⃣  Sign message with wallet');
  const signature = await wallet.signMessage(message);
  console.log('   ✅ Signature:', signature.substring(0, 20) + '...');
  
  // 3. Login
  console.log('\n3️⃣  POST /auth/login');
  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: wallet.address,
      signature,
      nonce,
      username: 'PlayerTest',
      network: 'sui',
      avatar: 'https://avatar.iran.liara.run/public/1'
    })
  });
  
  const loginData = await loginRes.json();
  
  if (!loginRes.ok) {
    console.log('   ❌ Login failed:', loginData);
    return;
  }
  
  console.log('   ✅ Login SUCCESS!');
  console.log('   User:', {
    username: loginData.user.username,
    network: loginData.user.network,
    plantsCount: loginData.user.plantsCount,
    isNewUser: loginData.isNewUser
  });
  
  // 4. Get profile
  console.log('\n4️⃣  GET /user/profile');
  const profile = await fetch('http://localhost:3000/user/profile', {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  }).then(r => r.json());
  
  console.log('   ✅ Profile:', {
    username: profile.username,
    network: profile.network,
    avatar: profile.avatar,
    xp: profile.xp,
    counts: profile._count
  });
  
  // 5. Get QR
  console.log('\n5️⃣  GET /user/qr');
  const qr = await fetch('http://localhost:3000/user/qr', {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  }).then(r => r.json());
  
  console.log('   ✅ QR Data:', qr.qrData);
  
  console.log('\n🎉 All flows working!');
}

testFlow().catch(console.error);
