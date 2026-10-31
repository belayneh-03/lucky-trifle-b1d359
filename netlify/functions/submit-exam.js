const { createHash } = require('node:crypto');

const ANSWERS = [
    'true', 'c', 'true', 'a', 'b',
    'b', 'c', 'b', 'true', 'b',
    'b', 'c', 'false', 'microscope', 'biotechnology'
];

function respond(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body)
    };
}

async function openRollNumberStore() {
    const { getStore } = await import('@netlify/blobs');
    return getStore('biology-exam-roll-numbers');
}

function createHandler({
    getRollNumberStore = openRollNumberStore,
    fetchImpl = (...args) => fetch(...args)
} = {}) {
    return async (event) => {
        if (event.httpMethod !== 'POST') {
            return respond(405, { error: 'Method not allowed.' });
        }

        const token = process.env.BOT_TOKEN;
        const chatId = process.env.ADMIN_CHAT_ID;
        if (!token || !chatId) {
            console.error('Exam submission is missing BOT_TOKEN or ADMIN_CHAT_ID configuration.');
            return respond(500, { error: 'Exam submission is not configured. Please contact the instructor.' });
        }

        let submission;
        try {
            submission = JSON.parse(event.body || '');
        } catch {
            return respond(400, { error: 'Invalid submission data.' });
        }

        if (!submission || typeof submission !== 'object' || Array.isArray(submission)) {
            return respond(400, { error: 'Invalid submission data.' });
        }

        const studentName = typeof submission.studentName === 'string'
            ? submission.studentName.trim().replace(/\s+/g, ' ')
            : '';
        const rollNumber = typeof submission.rollNumber === 'string'
            ? submission.rollNumber.trim().replace(/\s+/g, ' ')
            : '';
        const answers = submission.answers;

        if (!studentName || studentName.length > 100 || !rollNumber || rollNumber.length > 50 ||
            !answers || typeof answers !== 'object' || Array.isArray(answers)) {
            return respond(400, { error: 'Enter a valid student name and roll number, then try again.' });
        }

        const normalizedRollNumber = rollNumber.normalize('NFKC').replace(/\s/g, '').toLowerCase();
        const rollNumberKey = `roll-${createHash('sha256').update(normalizedRollNumber).digest('hex')}`;
        let rollNumberStore;
        try {
            rollNumberStore = await getRollNumberStore();
            const { modified } = await rollNumberStore.setJSON(rollNumberKey, {
                rollNumber,
                studentName,
                reservedAt: new Date().toISOString()
            }, { onlyIfNew: true });

            if (!modified) {
                return respond(409, { error: 'This roll number has already submitted an exam. Contact the instructor if you think this is a mistake.' });
            }
        } catch (error) {
            console.error('Unable to reserve the student roll number.', error.name);
            return respond(503, { error: 'The exam service is temporarily unavailable. Please try again later.' });
        }

        const answerValues = ANSWERS.map((_, index) => {
            const value = answers[`q${index + 1}`];
            return typeof value === 'string' ? value.trim().slice(0, 100) : '';
        });

        const correctCount = answerValues.reduce((count, answer, index) => (
            count + (answer.toLowerCase() === ANSWERS[index] ? 1 : 0)
        ), 0);
        const scorePercent = ((correctCount / ANSWERS.length) * 15).toFixed(2);
        const answerLines = answerValues.map((answer, index) => {
            const correct = answer.toLowerCase() === ANSWERS[index];
            return `Q${index + 1}: ${correct ? 'Correct' : 'Incorrect'} - ${answer || 'No answer'}`;
        });
        const message = [
            'Biology exam submission',
            `Student: ${studentName}`,
            `Roll number: ${rollNumber}`,
            `Score: ${correctCount}/${ANSWERS.length} (${scorePercent}% / 15%)`,
            '',
            ...answerLines
        ].join('\n');

        let notificationFailed = false;
        try {
            const telegramResponse = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message })
            });
            const telegramResult = await telegramResponse.json();
            if (!telegramResponse.ok || !telegramResult.ok) {
                console.error('Telegram rejected an exam submission notification.', telegramResponse.status);
                notificationFailed = true;
            }
        } catch (error) {
            console.error('Telegram notification request failed.', error.name);
            notificationFailed = true;
        }

        if (notificationFailed) {
            try {
                await rollNumberStore.delete(rollNumberKey);
            } catch (rollbackError) {
                console.error('Unable to release a roll number after notification failure.', rollbackError.name);
                return respond(500, { error: 'Your submission could not be confirmed. Contact the instructor before trying again.' });
            }
            return respond(502, { error: 'The result could not be sent to the instructor. Please try again.' });
        }

        return respond(200, { success: true });
    };
}

exports.createHandler = createHandler;
exports.handler = createHandler();
