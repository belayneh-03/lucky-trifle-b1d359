document.addEventListener('DOMContentLoaded', () => {
    const violationStorageKey = 'biology-exam-visibility-violations';
    let savedViolations = 0;
    try {
        const storedViolations = Number(sessionStorage.getItem(violationStorageKey));
        if (Number.isInteger(storedViolations) && storedViolations > 0) {
            savedViolations = Math.min(storedViolations, 2);
        }
    } catch (error) {
        console.warn('Unable to restore the exam integrity state.', error.name);
    }

    const state = {
        currentQuestionIndex: 0,
        visibilityViolations: savedViolations,
        locked: savedViolations >= 2,
        warningOpen: false,
        submitted: false
    };

    const examContainer = document.getElementById('exam-container');
    const successContainer = document.getElementById('success-container');
    const examForm = document.getElementById('biology-exam');

    const questionSlides = document.querySelectorAll('.question-slide');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-exam');
    const questionCounter = document.getElementById('question-counter');
    const submissionStatus = document.getElementById('submission-status');
    const integrityOverlay = document.getElementById('integrity-overlay');
    const integrityTitle = document.getElementById('integrity-title');
    const integrityMessage = document.getElementById('integrity-message');
    const integrityContinue = document.getElementById('integrity-continue');

    function showWarning() {
        state.warningOpen = true;
        integrityTitle.textContent = 'Exam integrity warning';
        integrityMessage.textContent = 'You left the exam page. Leaving it again will lock your exam. Select Continue Exam to return to your questions.';
        integrityContinue.classList.remove('hidden');
        integrityOverlay.classList.remove('hidden');
        integrityContinue.focus();
    }

    function lockExam() {
        state.locked = true;
        state.warningOpen = false;
        state.visibilityViolations = 2;
        try {
            sessionStorage.setItem(violationStorageKey, '2');
        } catch (error) {
            console.warn('Unable to persist the exam lock state.', error.name);
        }
        examForm.querySelectorAll('input, button').forEach((control) => {
            control.disabled = true;
        });
        integrityTitle.textContent = 'Exam locked';
        integrityMessage.textContent = 'Your exam has been locked because you left the exam page again. Please contact your instructor.';
        integrityContinue.classList.add('hidden');
        integrityOverlay.classList.remove('hidden');
        integrityTitle.tabIndex = -1;
        integrityTitle.focus();
    }

    if (state.locked) {
        lockExam();
    } else if (state.visibilityViolations === 1) {
        showWarning();
    }

    integrityContinue.addEventListener('click', () => {
        state.warningOpen = false;
        integrityOverlay.classList.add('hidden');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'hidden' || state.submitted || state.locked) {
            return;
        }

        state.visibilityViolations++;
        try {
            sessionStorage.setItem(violationStorageKey, String(state.visibilityViolations));
        } catch (error) {
            console.warn('Unable to persist the exam warning state.', error.name);
        }

        if (state.visibilityViolations === 1) {
            showWarning();
        } else {
            lockExam();
        }
    });

    function updateQuestionView() {
        questionSlides.forEach((slide, index) => {
            slide.classList.toggle('active', index === state.currentQuestionIndex);
        });

        prevBtn.disabled = state.currentQuestionIndex === 0;
        
        if (state.currentQuestionIndex === questionSlides.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }

        questionCounter.textContent = `Question ${state.currentQuestionIndex + 1} of ${questionSlides.length}`;
    }

    updateQuestionView();

    prevBtn.addEventListener('click', () => {
        if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex--;
            updateQuestionView();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (state.currentQuestionIndex < questionSlides.length - 1) {
            state.currentQuestionIndex++;
            updateQuestionView();
        }
    });

    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (state.locked || state.warningOpen) {
            return;
        }

        submitBtn.disabled = true;
        submissionStatus.textContent = '';

        try {
            const formData = new FormData(examForm);
            const results = Object.fromEntries(formData.entries());

            const response = await fetch('/.netlify/functions/submit-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: results.studentName,
                    rollNumber: results.rollNumber,
                    answers: Object.fromEntries(
                        Object.entries(results).filter(([key]) => /^q\d+$/.test(key))
                    )
                })
            });
            const submission = await response.json();
            if (!response.ok) {
                throw new Error(submission.error || 'The exam could not be submitted.');
            }

            let correctCount = 0;
            const summaryLines = [];

            questionSlides.forEach((slide, index) => {
                const qNum = index + 1;
                const correctAns = slide.getAttribute('data-answer').toLowerCase();
                const studentAns = (results[`q${qNum}`] || "").toString().toLowerCase().trim();

                const isCorrect = studentAns === correctAns;
                if (isCorrect) correctCount++;

                summaryLines.push(`Q${qNum}: ${isCorrect ? 'Correct' : 'Incorrect'} (Your answer: ${studentAns || 'None'}, Correct answer: ${correctAns})`);
            });

            const totalQuestions = questionSlides.length;
            const scorePercent = ((correctCount / totalQuestions) * 15).toFixed(2);

            state.submitted = true;
            examContainer.classList.add('hidden');
            successContainer.innerHTML = `
                <div class="card">
                    <h2>Exam Submitted!</h2>
                    <div class="score-display">${correctCount} / ${totalQuestions}</div>
                    <p>Your Grade: <span class="accent-text">${scorePercent}%</span> / 15%</p>
                    <div class="result-card" style="text-align: left; max-height: 300px; overflow-y: auto;">
                        <h4>Review your answers:</h4>
                        <pre id="answer-review" style="font-family: inherit; white-space: pre-wrap;"></pre>
                    </div>
                    <p style="margin-top: 20px; color: #666;">Your result has been sent to the instructor.</p>
                </div>
            `;
            successContainer.querySelector('#answer-review').textContent = summaryLines.join('\n');
            successContainer.classList.remove('hidden');
        } catch (error) {
            submissionStatus.textContent = error.message || 'Unable to submit your exam. Please try again.';
            submitBtn.disabled = false;
        }
    });
});
