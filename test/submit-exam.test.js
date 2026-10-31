const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHandler } = require('../netlify/functions/submit-exam');

const answers = ['true', 'c', 'true', 'a', 'b', 'b', 'c', 'b', 'true', 'b', 'b', 'c', 'false', 'microscope', 'biotechnology'];

function createEvent(rollNumber = 'AB 12') {
    return {
        httpMethod: 'POST',
        body: JSON.stringify({
            studentName: 'Test Student',
            rollNumber,
            answers: Object.fromEntries(answers.map((answer, index) => [`q${index + 1}`, answer]))
        })
    };
}

test('sends a valid exam record and reserves its roll number', async () => {
    const previousToken = process.env.BOT_TOKEN;
    const previousChatId = process.env.ADMIN_CHAT_ID;
    process.env.BOT_TOKEN = 'test-token';
    process.env.ADMIN_CHAT_ID = '12345';

    const writes = [];
    let telegramMessage;
    const store = {
        setJSON: async (...args) => {
            writes.push(args);
            return { modified: true };
        },
        delete: async () => {}
    };
    const handler = createHandler({
        getRollNumberStore: async () => store,
        fetchImpl: async (url, options) => {
            telegramMessage = JSON.parse(options.body);
            assert.equal(url, 'https://api.telegram.org/bottest-token/sendMessage');
            return { ok: true, json: async () => ({ ok: true }) };
        }
    });

    try {
        const response = await handler(createEvent());
        assert.equal(response.statusCode, 200);
        assert.equal(writes.length, 1);
        assert.equal(writes[0][2].onlyIfNew, true);
        assert.match(telegramMessage.text, /Score: 15\/15 \(15\.00% \/ 15%\)/);
        assert.match(telegramMessage.text, /Roll number: AB 12/);
    } finally {
        if (previousToken === undefined) delete process.env.BOT_TOKEN;
        else process.env.BOT_TOKEN = previousToken;
        if (previousChatId === undefined) delete process.env.ADMIN_CHAT_ID;
        else process.env.ADMIN_CHAT_ID = previousChatId;
    }
});

test('rejects duplicate roll numbers regardless of spacing and case', async () => {
    const previousToken = process.env.BOT_TOKEN;
    const previousChatId = process.env.ADMIN_CHAT_ID;
    process.env.BOT_TOKEN = 'test-token';
    process.env.ADMIN_CHAT_ID = '12345';

    const keys = [];
    let calls = 0;
    const store = {
        setJSON: async (key) => {
            keys.push(key);
            calls++;
            return { modified: calls === 1 };
        },
        delete: async () => {}
    };
    let notificationCount = 0;
    const handler = createHandler({
        getRollNumberStore: async () => store,
        fetchImpl: async () => {
            notificationCount++;
            return { ok: true, json: async () => ({ ok: true }) };
        }
    });

    try {
        assert.equal((await handler(createEvent('AB 12'))).statusCode, 200);
        const duplicateResponse = await handler(createEvent(' ab12 '));
        assert.equal(duplicateResponse.statusCode, 409);
        assert.equal(keys[0], keys[1]);
        assert.equal(notificationCount, 1);
    } finally {
        if (previousToken === undefined) delete process.env.BOT_TOKEN;
        else process.env.BOT_TOKEN = previousToken;
        if (previousChatId === undefined) delete process.env.ADMIN_CHAT_ID;
        else process.env.ADMIN_CHAT_ID = previousChatId;
    }
});
