# HAYU SECONDARY SCHOOLS - Grade 11 Biology Mid Exam

This project is a complete automated exam system featuring a Telegram Bot for registration and a web-based exam interface.

## Features
- **Telegram Bot Link**: Students can start the bot to receive a direct link to the exam.
- **Student Identification**: Students enter their name and roll number; no instructor access code is required.
- **Web-Based Exam**: A responsive, one-question-at-a-time exam interface.
- **Automated Grading**: Instant scoring and detailed record generation.
- **Telegram Reporting**: Student identity, score, and answers are sent to the instructor after submission.
- **Duplicate Prevention**: Roll numbers are reserved atomically and can only be used for one successful submission.
- **Exam Integrity Warning**: The first time the exam page is left, a warning appears; leaving it again locks the exam.
- **No Page Scrolling**: One question is shown at a time in a viewport-fitted layout.

Web pages cannot reliably prevent screenshots or screen recording. Those are controlled by each student's device and operating system.
Tab-switch checks are browser-side deterrents and cannot prevent a determined user from bypassing the page or using another device.

## Setup Instructions
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. In Netlify, set the `BOT_TOKEN` and `ADMIN_CHAT_ID` environment variables for the site. Keep the bot token server-side; never put it in `script.js` or other browser files. Since the bot token was shared in chat, revoke it with BotFather and use a newly generated token.
4. Ensure the instructor has started the Telegram bot at least once so Telegram allows it to receive messages.
5. The Telegram bot's exam button opens `http://super-cactus-a6e729.netlify.app`. Redeploy the site to Netlify to publish the exam and the function in `netlify/functions/submit-exam.js`. Netlify Blobs stores submitted roll numbers persistently; it is used by the function to reject duplicates.
6. To run the Telegram link bot locally, set `$env:BOT_TOKEN` and `$env:ADMIN_CHAT_ID` in PowerShell, then run `node .\bot.js`.

## Tech Stack
- HTML, CSS, JavaScript
- Node.js (Telegraf library)
