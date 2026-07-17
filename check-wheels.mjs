import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.type() === 'log') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`[BROWSER PAGE ERROR] ${error.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`[BROWSER REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('Navigating to http://localhost:5174/ ...');
  try {
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0', timeout: 15000 });
  } catch (e) {
    console.log('Goto error:', e.message);
  }
  
  await new Promise(r => setTimeout(r, 3000));

  // Press W to drive forward
  console.log('Pressing W for 10 seconds...');
  await page.keyboard.down('KeyW');
  await new Promise(r => setTimeout(r, 10000));
  await page.keyboard.up('KeyW');

  // Read speed from HUD
  const speed = await page.evaluate(() => {
    const el = document.querySelector('#speedometer span');
    return el ? el.textContent : 'Not found';
  });
  console.log('Speed after 3 seconds of driving:', speed);

  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to screenshot.png');
  await browser.close();
})();
