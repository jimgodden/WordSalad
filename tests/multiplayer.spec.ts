import { test, expect, type Page } from '@playwright/test';

test.describe('Linguistic Linguini Multiplayer Flow', () => {
    test.describe.configure({ mode: 'serial' });

    let hostPage: Page;
    let guestPage: Page;

    async function createTwoPlayerRoom(hostName: string, guestName: string) {
        await hostPage.goto('/');
        await hostPage.getByPlaceholder('Your Name').fill(hostName);
        await hostPage.getByTestId('create-game-btn').click();
        await hostPage.getByTestId('launch-room-btn').click();

        const roomCodeElement = hostPage.locator('text=Room:');
        await expect(roomCodeElement).toBeVisible();
        const roomCode = (await roomCodeElement.innerText()).replace('Room: ', '').trim().split('\n')[0];

        await guestPage.goto('/');
        await guestPage.getByPlaceholder('Your Name').fill(guestName);
        await guestPage.getByTestId('join-game-btn').click();
        await guestPage.getByTestId('room-code-input').fill(roomCode);
        await guestPage.getByTestId('join-room-confirm-btn').click();

        await expect(hostPage.getByText(guestName, { exact: true })).toBeVisible();
        await expect(guestPage.getByText(hostName, { exact: true })).toBeVisible();

        return roomCode;
    }

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
        const roomCode = await createTwoPlayerRoom('Chef Ramsey', 'Sous Chef');
        expect(roomCode).toHaveLength(4);

        // 3. Start Game
        await hostPage.waitForSelector('[data-testid="start-game-btn"]');
        await hostPage.getByTestId('start-game-btn').click({ force: true });

        // Host chooses the first prompt
        await expect(hostPage.getByTestId('choose-prompt-btn')).toBeVisible();
        await expect(guestPage.locator('text=is choosing the next prompt')).toBeVisible();
        await hostPage.getByTestId('choose-prompt-btn').click();

        // Verify Prompt Reveal Phase
        await expect(hostPage.locator('text=Get Ready...')).toBeVisible();
        await expect(guestPage.locator('text=Get Ready...')).toBeVisible();

        // Wait for Construction Phase (5s timeout in server)
        await expect(hostPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });
        await expect(guestPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });

        // 4. Submit Salads
        await hostPage.getByTestId('submit-salad-btn').click();
        await guestPage.getByTestId('submit-salad-btn').click();

        // 5. Voting Phase
        await expect(hostPage.locator('text=Pick your single favorite dish')).toBeVisible();

        // Host votes for Guest
        await hostPage.locator('[data-testid^="favorite-vote-"]').first().click();
        // Guest votes for Host
        await guestPage.locator('[data-testid^="favorite-vote-"]').first().click();

        // 6. Winner Reveal
        await expect(hostPage.getByTestId('winner-announcement')).toBeVisible();

        // 7. Leaderboard
        await expect(hostPage.locator('text=Leaderboard')).toBeVisible({ timeout: 10000 });
        await expect(guestPage.locator('text=Leaderboard')).toBeVisible({ timeout: 10000 });

        // At least half the players ready advances to next prompt selection.
        await hostPage.getByTestId('ready-next-recipe-btn').click();
        await expect(guestPage.locator('text=is choosing the next prompt')).toBeVisible({ timeout: 10000 });

        // 8. Next chooser can now pick the following prompt
        await expect(guestPage.getByTestId('choose-prompt-btn')).toBeVisible({ timeout: 10000 });
    });

    test('Chooser can skip prompts before locking one in', async () => {
        await createTwoPlayerRoom('Prompt Chef', 'Waiting Chef');

        await hostPage.getByTestId('start-game-btn').click({ force: true });

        const promptCard = hostPage.locator('text=Current Prompt').locator('..');
        await expect(hostPage.getByTestId('skip-prompt-btn')).toBeVisible();
        await expect(hostPage.getByTestId('choose-prompt-btn')).toBeVisible();

        const initialPrompt = (await promptCard.innerText()).trim();
        await hostPage.getByTestId('skip-prompt-btn').click();

        await expect(hostPage.getByTestId('skip-prompt-btn')).toContainText('9 left');
        await expect(promptCard).not.toHaveText(initialPrompt);

        await hostPage.getByTestId('choose-prompt-btn').click();
        await expect(hostPage.locator('text=Get Ready...')).toBeVisible();
        await expect(guestPage.locator('text=Get Ready...')).toBeVisible();
    });

    test('Tie for best dish does not award bonus point', async () => {
        await createTwoPlayerRoom('Tie Chef', 'Other Tie Chef');

        await hostPage.getByTestId('start-game-btn').click({ force: true });
        await hostPage.getByTestId('choose-prompt-btn').click();

        await expect(hostPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });
        await expect(guestPage.getByTestId('submit-salad-btn')).toBeVisible({ timeout: 30000 });

        await hostPage.getByTestId('submit-salad-btn').click();
        await guestPage.getByTestId('submit-salad-btn').click();

        await expect(hostPage.locator('text=Pick your single favorite dish')).toBeVisible();
        await hostPage.locator('[data-testid^="favorite-vote-"]').first().click();
        await guestPage.locator('[data-testid^="favorite-vote-"]').first().click();

        await expect(hostPage.locator('text=Best Dish Tie')).toBeVisible({ timeout: 10000 });
        await expect(hostPage.locator('text=No bonus point this round.')).toBeVisible();

        await expect(hostPage.locator('text=Leaderboard')).toBeVisible({ timeout: 10000 });
        const tieChefRow = hostPage.locator('div.flex.items-center.justify-between').filter({
            has: hostPage.getByText('Tie Chef', { exact: true })
        });
        const otherTieChefRow = hostPage.locator('div.flex.items-center.justify-between').filter({
            has: hostPage.getByText('Other Tie Chef', { exact: true })
        });

        await expect(tieChefRow).toContainText('1 pts');
        await expect(otherTieChefRow).toContainText('1 pts');
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
