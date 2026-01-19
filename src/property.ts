import { chromium, Page } from "playwright";
import * as readline from "readline";

// Ask user for input
function ask(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            if (answer.trim().toLowerCase() === "q") process.exit(0);
            resolve(answer.trim());
        })
    );
}

// Fetch autocomplete results from the website's API
async function fetchAutocomplete(page: Page, query: string) {
    const response = await page.request.get(
        `https://www.onthehouse.com.au/odin/api/locations?query=${encodeURIComponent(query)}`
    );

    if (!response.ok()) {
        throw new Error("Failed to fetch autocomplete");
    }

    return response.json();
}

// Search address function
async function searchAddress(addressInput?: string, autoSelect: boolean = false): Promise<{ 
    candidates: { id: number; address: string }[]; 
    selectedAddress: string;
    page: Page;
    browser: any;
    context: any;
}> {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://www.onthehouse.com.au/");
    const input = addressInput || await ask("Please enter an address: ");
    const data = await fetchAutocomplete(page, input);
    if (data.content.length === 0) {
        console.log("\n No autocomplete results found.");
        return { candidates: [], selectedAddress: "", page, browser, context };
    }

    const candidates = data.content.map((candidate: any, id: number) => ({
        id: id + 1,
        address: candidate.formattedAddress  
    }));
    console.log("\n Full candidates list:");
    console.log(JSON.stringify(candidates, null, 2));

    // Let user select from the list
    let selectedId = 0;
    if (!autoSelect) {
        const choice = await ask("\nSelect address number (or press Enter for #1): ");
        selectedId = choice ? parseInt(choice) - 1 : 0;
    }

    if (selectedId < 0 || selectedId >= data.content.length) {
        console.log(" Invalid selection.");
        return { candidates, selectedAddress: "", page, browser, context };
    }
    const selected = data.content[selectedId];
    console.log(`\n Selected: ${selected.formattedAddress}\n`);

    return { candidates, selectedAddress: selected.formattedAddress, page, browser, context };
}

// Navigate to property card page
async function navigate(page: Page, selectedAddress: string): Promise<void> {
    await page.fill('input#homeTA', selectedAddress);
    await page.waitForSelector('[role="option"]', { timeout: 5000 }).catch(() => null);
    await page.press('input#homeTA', 'Home');
    await page.waitForTimeout(300);
    await page.press('input#homeTA', 'Enter');
    await page.waitForTimeout(500);
    await page.click('button:has-text("search")');
    await page.waitForURL(/https:\/\/www\.onthehouse\.com\.au\/real-estate\/.*/, { timeout: 6000 });

    const propertyCards = page.locator('.PropertyCardSearch__propertyCard--FqRCV');
    await propertyCards.first().waitFor({ state: 'attached', timeout: 6000 });
    const firstCard = propertyCards.first();
    const link = firstCard.locator('a[href^="/property/"]').first();
    await link.waitFor({ state: 'attached', timeout: 3000 });
    const href = await link.getAttribute('href');
    if (!href) {
        throw new Error('Property card has no href');
    }
    await page.goto(`https://www.onthehouse.com.au${href}`);
}

// Property valuation function
async function propertyValuation(page: Page, address: string): Promise<{ 
        address: string; 
        low: string | undefined; 
        high: string | undefined; 
        confidence: string } | undefined> {
    if (!address) return;
    const value = page.locator(".d-flex.justify-content-between.mt-2 .mdText > div");
    await value.first().waitFor({ state: "attached", timeout: 15000 });

    const confidenceElement = page.locator(
        ".ValuationEstimates__confidenceContainer--ubf4A"
    );
    const confidenceText =
        (await confidenceElement.textContent())?.trim() || "N/A";

    if ((await value.count()) >= 2) {
        const low = (await value.nth(0).textContent())?.trim();
        const high = (await value.nth(1).textContent())?.trim();

        const result = {
            address: address,
            low: low,
            high: high,
            confidence: confidenceText
        };

        console.log("\n Property Valuation:");
        console.log(JSON.stringify(result, null, 2));
        
        return result;
    }
}

// Entry 
async function main() {
    const { selectedAddress, page, browser } = await searchAddress();
    await navigate(page, selectedAddress);
    await propertyValuation(page, selectedAddress);
    await browser.close();
}

main();

export {
    searchAddress,
    navigate,
    propertyValuation
};


// 52 walker st, Turrella
// 1037/1 Finch Dr, Eastgardens