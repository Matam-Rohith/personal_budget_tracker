import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'login.html',
  'register.html',
  'dashboard.html',
  'supabaseClient.js',
  'tracker_image.png',
  'add.png',
  'budget.png',
  'home1.png',
  'login.png',
  'register.png'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(publicDir, file));
  }
});

console.log('Build completed: Assets prepared for static and serverless hosting.');
