const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching Windows Chrome from WSL...');
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log('Browser launched. Opening page...');
  const page = await browser.newPage();
  
  // Capture browser console logs
  page.on('console', msg => {
    const type = msg.type();
    if (['error', 'warning', 'log'].includes(type)) {
      console.log(`BROWSER [${type.toUpperCase()}]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('BROWSER [PAGE ERROR]:', err.message);
  });

  console.log('Navigating to http://localhost:5173/ ...');
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Page loaded successfully. Waiting 5 seconds for runtime errors...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (err) {
    console.error('Failed to load page:', err.message);
  } finally {
    await browser.close();
  }
})();
