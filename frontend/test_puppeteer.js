const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: "new"
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
        page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

        await page.goto('http://localhost:5173/');
        console.log("Page loaded");
        
        // Wait for input to appear
        await page.waitForSelector('input[placeholder="Nickname"]', { timeout: 5000 });
        console.log("Found Nickname input.");
        
        await page.type('input[placeholder="Nickname"]', 'player1');
        await page.click('button[type="submit"]');
        
        await new Promise(r => setTimeout(r, 2000));
        console.log("Clicked Continue.");

        // Click Start Match
        const startBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            return btns.find(b => b.textContent && b.textContent.includes('Start Match')) !== undefined;
        });

        if (startBtn) {
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const target = btns.find(b => b.textContent && b.textContent.includes('Start Match'));
                target.click();
            });
            console.log("Matchmaking started.");
            await new Promise(r => setTimeout(r, 1000));
        } else {
            console.log("Start match button not found.");
        }
        
        await browser.close();
        console.log("Puppeteer test completed.");
    } catch (e) {
        console.error("Test execution failed:", e);
        process.exit(1);
    }
})();
