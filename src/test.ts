import { chromium, Page } from "playwright";
import * as readline from "readline";

/* ---------------- CLI ---------------- */

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

/* ---------------- API ---------------- */

async function fetchAutocomplete(page: Page, query: string) {
    const response = await page.request.get(
        `https://www.onthehouse.com.au/odin/api/locations?query=${encodeURIComponent(query)}`
    );

    if (!response.ok()) {
        throw new Error("Failed to fetch autocomplete");
    }

    return response.json();
}

/* ---------------- Main Logic ---------------- */

async function searchAddress(page: Page): Promise<string> {
    await page.goto("https://www.onthehouse.com.au/");
    const input = await ask("Please enter an address: ");
    const data = await fetchAutocomplete(page, input);
    if (data.content.length === 0) {
        console.log("\n No autocomplete results found.");
        return "";
    }

    // Display full candidates list
    console.log("\n✅ Full candidates list:");
    data.content.forEach((candidate: any, index: number) => {
        console.log(`  ${index + 1}. ${candidate.formattedAddress}`);
    });

    // Let user select from the list
    const choice = await ask("\nSelect address number (or press Enter for #1): ");
    const selectedIndex = choice ? parseInt(choice) - 1 : 0;

    if (selectedIndex < 0 || selectedIndex >= data.content.length) {
        console.log(" Invalid selection.");
        return "";
    }

    const selected = data.content[selectedIndex];
    console.log(`\n✅ Selected: ${selected.formattedAddress}\n`);

    // Use selected address for search
    await page.fill('input#homeTA', selected.formattedAddress);
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

    return selected.formattedAddress;
}

/* ---------------- Valuation ---------------- */

async function propertyValuation(page: Page, address: string): Promise<void> {
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

        console.log(`\n========== Property Valuation =========`);
        console.log(`Address: ${address}`);
        console.log(`Low: ${low}`);
        console.log(`High: ${high}`);
        console.log(`Confidence: ${confidenceText}`);
        console.log(`======================================\n`);
    }
}

/* ---------------- Entry ---------------- */

async function main() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    const address = await searchAddress(page);
    await propertyValuation(page, address);

    await browser.close();
}

main();
