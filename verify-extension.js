const fs = require('fs');

console.log('🔍 Verifying extension files...');

// Check if the dist/popup.js has our fixes
const popupContent = fs.readFileSync('dist/popup.js', 'utf8');

console.log('\n📊 Checking for key fixes:');

// Check for version log
if (popupContent.includes('EXTENSION_VERSION')) {
  console.log('✅ Version logging: FOUND');
} else {
  console.log('❌ Version logging: NOT FOUND');
}

// Check for direct RPC supply fix
if (popupContent.includes('DIRECT RPC SUPPLY FIX')) {
  console.log('✅ Direct RPC supply fix: FOUND');
} else {
  console.log('❌ Direct RPC supply fix: NOT FOUND');
}

// Check for formatSupply function
if (popupContent.includes('formatSupply(supply, decimals)')) {
  console.log('✅ formatSupply function: FOUND');
} else {
  console.log('❌ formatSupply function: NOT FOUND');
}

// Check for immediate test
if (popupContent.includes('IMMEDIATE TEST')) {
  console.log('✅ Immediate test: FOUND');
} else {
  console.log('❌ Immediate test: NOT FOUND');
}

// Check for verification
if (popupContent.includes('VERIFICATION')) {
  console.log('✅ Verification logging: FOUND');
} else {
  console.log('❌ Verification logging: NOT FOUND');
}

console.log('\n📁 File sizes:');
console.log(`dist/popup.js: ${Math.round(popupContent.length / 1024)}KB`);

const htmlContent = fs.readFileSync('dist/popup.html', 'utf8');
console.log(`dist/popup.html: ${Math.round(htmlContent.length / 1024)}KB`);

console.log('\n🔧 Extension should show these logs when loaded:');
console.log('- 🚀🚀🚀 EXTENSION LOADED - VERSION: SUPPLY-FIX-[timestamp]');
console.log('- 🧪 IMMEDIATE TEST - Updated tokenSupply to: TEST-SUPPLY-FIX-[timestamp]');
console.log('- 🔧 DIRECT RPC SUPPLY FIX - Getting supply for display');
console.log('- 🔧 formatSupply called with: supply=[number], decimals=[number]');
console.log('- 🔧 VERIFICATION - tokenSupply element content: "[formatted value]"');

console.log('\n📋 Next steps:');
console.log('1. Go to chrome://extensions/');
console.log('2. Find "Nilo - Solana Security" extension');
console.log('3. Click the reload button (circular arrow)');
console.log('4. Open the extension popup');
console.log('5. Open browser console (F12 → Console)');
console.log('6. Look for the logs above');
console.log('7. Test with token: CKkSKGwB9zUgw4w2dkYpRD1KXCvNMTP65ZHpoMkHpump');
console.log('8. Expected supply: 999.94M (not "999 938 389,75")'); 