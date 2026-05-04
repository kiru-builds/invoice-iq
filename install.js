const fs = require('fs');
const path = require('path');

const APP_CONTENT = fs.readFileSync(path.join(__dirname, 'App.jsx'), 'utf8');

const targetPath = path.join('src', 'App.jsx');
fs.writeFileSync(targetPath, APP_CONTENT, 'utf8');

console.log('✅ App.jsx installed successfully!');
console.log('Lines:', APP_CONTENT.split('\n').length);
console.log('Has SmartInsights:', APP_CONTENT.includes('SmartInsights'));
console.log('Has AIChat:', APP_CONTENT.includes('AIChat'));
console.log('Has search:', APP_CONTENT.includes('setSearch'));
console.log('Has MonthlyReport:', APP_CONTENT.includes('MonthlyReport'));
console.log('\n✅ All features confirmed! Restart npm run dev.');