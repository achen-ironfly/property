import { chromium, Page } from "playwright";
import * as readline from "readline";

function ask(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            if (answer.trim().toLowerCase() === "q") {
                process.exit(0);
            }
            resolve(answer);
        })
    );
}

async function searchAddress(page: Page): Promise<string> {
    await page.goto("https://www.onthehouse.com.au/");

    const address = await ask("Please enter an address: ");
    await page.fill('input#homeTA', address);
    await page.waitForSelector('[role="option"]', { timeout: 5000 }).catch(() => { null });
    await page.press('input#homeTA', 'Home', { timeout: 2000 });
    await page.press('input#homeTA', 'Enter', { timeout: 2000 });
    await page.click('button:has-text("search")');
    await page.waitForURL(/https:\/\/www\.onthehouse\.com\.au\/real-estate\/.*/, { timeout: 6000 });

    const propertyCards = page.locator('.PropertyCardSearch__propertyCard--FqRCV');
    await propertyCards.first().waitFor({ state: 'attached', timeout: 6000 });

    let found = false;
    for (let i = 0; i < await propertyCards.count(); i++) {
        const card = propertyCards.nth(i);
        const cardText = (await card.innerText()).replace(/\s+/g, ' ').trim();

        if (cardText.toUpperCase().includes(address.toUpperCase())) {
            const link = card.locator('a[href^="/property/"]').first();
            await link.waitFor({ state: 'attached', timeout: 3000 });
            const href = await link.getAttribute('href');
            if (!href) {
                throw new Error('Matched card has no property href');
            }
            await page.goto(`https://www.onthehouse.com.au${href}`);
            found = true;
            break;
        }
    }

    if (!found) {
        console.log(`No matching property found for: ${address}`);
        return '';
    }
    
    return address;
}

async function propertyValuation(page: Page, address: string): Promise<void> {
    if (!address) {
        console.log('No address provided');
        return;
    }

    const value = page.locator('.d-flex.justify-content-between.mt-2 .mdText > div');
    await value.first().waitFor({ state: 'attached', timeout: 6000});
    const valueCount = await value.count();
    
    const confidenceElement = page.locator('.ValuationEstimates__confidenceContainer--ubf4A');
    const confidence = await confidenceElement.textContent().catch(() => 'N/A');
    const confidenceText = confidence?.trim() || 'N/A';
    
    if (valueCount >= 2) {
        const lowValue = await value.nth(0).textContent();
        const highValue = await value.nth(1).textContent();
        
        const lowPrice = lowValue?.trim() || 'N/A';
        const highPrice = highValue?.trim() || 'N/A';
        
        console.log(`\n========== Property Valuation ==========`);
        console.log(`Address: ${address}`);
        console.log(`Low: ${lowPrice}`);
        console.log(`High: ${highPrice}`);
        console.log(`Confidence: ${confidenceText}`);
        console.log(`=========================================\n`);
    } else {
        console.log('Could not find valuation values');
    }
}

async function main(){
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const address = await searchAddress(page);
    await propertyValuation(page, address);

}

main();