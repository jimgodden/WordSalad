import { test, expect, type Page } from '@playwright/test';

test.describe('Linguistic Linguini Multiplayer Flow', () => {
    let hostPage: Page;
    let guestPage: Page;

    test.beforeEach(async ({ browser }) => {
        // Create two isolated browser contexts
        const hostContext = await browser.newContext();
        const guestContext = await browser.newContext();
        hostPage = await hostContext.newPage();
        guestPage = await guestContext.newPage();

        // Capture logs
        hostPage.on('console', msg => console.log('HOST CONSOLE:', msg.text()));
        guestPage.on('console', msg => console.log('GUEST CONSOLE:', msg.text()));
        hostPage.on('pageerror', err => console.log('HOST ERROR:', err.message));
        guestPage.on('pageerror', err => console.log('GUEST ERROR:', err.message));
    });

    test('Complete Game Loop', async () => {
        // 1. Host Creates Room
        await hostPage.goto('/');
        await hostPage.getByPlaceholder('Your Name').fill('Chef Ramsey');
        await hostPage.getByTestId('create-game-btn').click();
        await hostPage.getByTestId('launch-room-btn').click();

        // Get Room Code
        const roomCodeElement = hostPage.locator('text=Room:');
        await expect(roomCodeElement).toBeVisible();

        // Handle potential button text if it was inside, but it's next to it.
        const roomCode = (await roomCodeElement.innerText()).replace('Room: ', '').trim().split('\n')[0];

        expect(roomCode).toHaveLength(4);

        // 2. Guest Joins Room
        await guestPage.goto('/');
        await guestPage.getByPlaceholder('Your Name').fill('Sous Chef');
        await guestPage.getByTestId('join-game-btn').click();
        await guestPage.getByTestId('room-code-input').fill(roomCode);
        await guestPage.getByTestId('join-room-confirm-btn').click();

        // Verify Lobby
        await expect(hostPage.locator('text=Sous Chef')).toBeVisible();
        await expect(guestPage.locator('text=Chef Ramsey')).toBeVisible();

        // 3. Start Game
        await hostPage.waitForSelector('[data-testid="start-game-btn"]');
        await hostPage.getByTestId('start-game-btn').click({ force: true });

        // Verify Prompt Phase
        await expect(hostPage.locator('text=Get Ready...')).toBeVisible();
        await expect(guestPage.locator('text=Get Ready...')).toBeVisible();

        // Wait for Construction Phase (5s timeout in server)
        await expect(hostPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });
        await expect(guestPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });

        // 4. Submit Salads
        await hostPage.getByTestId('submit-salad-btn').click();
        await guestPage.getByTestId('submit-salad-btn').click();

        // 5. Voting Phase
        await expect(hostPage.locator('text=Vote for your favorites!')).toBeVisible();

        // Host votes for Guest (Saucy) - using partial match or first available
        await hostPage.locator('[data-testid^="vote-saucy-"]').first().click();
        // Guest votes for Host (Funny)
        await guestPage.locator('[data-testid^="vote-funny-"]').first().click();

        // 6. Results
        await expect(hostPage.locator('text=Round Over!')).toBeVisible();

        // 7. End Game
        // Host clicks End Game
        await hostPage.getByTestId('end-game-btn').click();

        // Handle confirm dialog
        hostPage.on('dialog', dialog => dialog.accept());

        // Results -> Game Over
        await expect(hostPage.locator('text=GAME OVER')).toBeVisible();
        await expect(guestPage.locator('text=GAME OVER')).toBeVisible();
    });
    test('Join via Invite Link', async () => {
        // 1. Host Creates Room
        await hostPage.goto('/');
        await hostPage.getByPlaceholder('Your Name').fill('Host Chef');
        await hostPage.waitForTimeout(1000); // Wait for render
        console.log('Waiting for Avatar 7...');
        await hostPage.waitForSelector('[data-testid="avatar-btn-7"]');
        console.log('Clicking Avatar 7...');
        await hostPage.getByTestId('avatar-btn-7').click();
        console.log('Avatar 7 Clicked. Clicking Create Game...');
        await hostPage.getByTestId('create-game-btn').click();
        console.log('Clicking Launch Room...');
        await hostPage.getByTestId('launch-room-btn').click();

        // Get Room Code
        const roomCodeElement = hostPage.locator('text=Room:');
        await expect(roomCodeElement).toBeVisible();

        // Handle potential button text if it was inside, but it's next to it.
        const roomCode = (await roomCodeElement.innerText()).replace('Room: ', '').trim().split('\n')[0];

        expect(roomCode).toHaveLength(4);

        // 2. Guest uses Invite Link
        await guestPage.goto(`/?room=${roomCode}`);

        // Verify Guest is in Join Menu with Code Filled
        await expect(guestPage.getByTestId('room-code-input')).toHaveValue(roomCode);

        // Guest enters name and joins
        await guestPage.getByPlaceholder('Your Name').fill('Guest Chef');
        await guestPage.getByTestId('avatar-btn-5').click(); // Taco Chef
        await guestPage.getByTestId('join-room-confirm-btn').click();

        // Verify Lobby
        await expect(hostPage.locator('text=Guest Chef')).toBeVisible();
        await expect(guestPage.locator('text=Host Chef')).toBeVisible();
    });
});
