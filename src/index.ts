/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { requireAuth } from './auth/middleware';
import { handleLogin } from './auth/login';
import { handleGuestLogin } from './auth/guest-login';
import { sha256, verifyGuestCookie } from './auth/utils';
import { AUTH_COOKIE_MAX_AGE, GUEST_AUTH_COOKIE_KEY } from './auth/constants';

async function getGuests(env: Env): Promise<Record<string, string>> {
        const guestsJson = await env.BIRTHDAY_KV.get('guests');
        if (!guestsJson) {
                return {};
        }
        return JSON.parse(guestsJson);
}

async function saveGuests(env: Env, guests: Record<string, string>): Promise<void> {
        await env.BIRTHDAY_KV.put('guests', JSON.stringify(guests));
}

async function getQuestions(env: Env): Promise<Record<string, string>> {
        const questionsJson = await env.BIRTHDAY_KV.get('questions');
        if (!questionsJson) {
                return {};
        }
        return JSON.parse(questionsJson);
}

async function saveQuestions(env: Env, questions: Record<string, string>): Promise<void> {
        await env.BIRTHDAY_KV.put('questions', JSON.stringify(questions));
}

interface GuestState {
        currentQuestion: string;
        currentGuest: string;
        answers: Record<string, Record<string, string>>;
}

async function getGuestState(env: Env, guestName: string): Promise<GuestState | null> {
        const stateJson = await env.BIRTHDAY_KV.get(`guest-state:${guestName}`);
        if (!stateJson) {
                return null;
        }
        return JSON.parse(stateJson);
}

async function saveGuestState(env: Env, guestName: string, state: GuestState): Promise<void> {
        await env.BIRTHDAY_KV.put(`guest-state:${guestName}`, JSON.stringify(state));
}

function getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
}

async function initializeGuestState(env: Env, guestName: string): Promise<GuestState> {
        const guests = await getGuests(env);
        const questions = await getQuestions(env);

        const guestNames = Object.keys(guests).filter(name => name !== guestName);
        const questionIds = Object.keys(questions);

        if (guestNames.length === 0) {
                throw new Error('No other guests available');
        }

        if (questionIds.length === 0) {
                throw new Error('No questions available');
        }

        const state: GuestState = {
                currentQuestion: getRandomElement(questionIds),
                currentGuest: getRandomElement(guestNames),
                answers: {}
        };

        await saveGuestState(env, guestName, state);
        return state;
}

async function getNextQuestion(env: Env, guestName: string, state: GuestState): Promise<boolean> {
        const guests = await getGuests(env);
        const questions = await getQuestions(env);

        const guestNames = Object.keys(guests).filter(name => name !== guestName);
        const questionIds = Object.keys(questions);

        if (guestNames.length === 0 || questionIds.length === 0) {
                // Clear state when no questions/guests available
                state.currentGuest = '';
                state.currentQuestion = '';
                return false;
        }

        // Find guests with unanswered questions
        const guestsWithUnanswered: string[] = [];
        for (const guest of guestNames) {
                const answeredQuestions = state.answers[guest] || {};
                const unansweredQuestions = questionIds.filter(qId => !answeredQuestions[qId]);
                if (unansweredQuestions.length > 0) {
                        guestsWithUnanswered.push(guest);
                }
        }

        if (guestsWithUnanswered.length === 0) {
                // All questions for all guests have been answered - clear state
                state.currentGuest = '';
                state.currentQuestion = '';
                return false;
        }

        // Pick a random guest with unanswered questions
        const targetGuest = getRandomElement(guestsWithUnanswered);
        const answeredQuestions = state.answers[targetGuest] || {};
        const availableQuestions = questionIds.filter(qId => !answeredQuestions[qId]);

        state.currentGuest = targetGuest;
        state.currentQuestion = getRandomElement(availableQuestions);

        return true;
}

async function handleGuestsAPI(request: Request, env: Env): Promise<Response> {
        const guests = await getGuests(env);

        if (request.method === 'GET') {
                const guestNames = Object.keys(guests);
                return new Response(JSON.stringify(guestNames), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'POST') {
                const body = await request.json() as { name?: string; password?: string };

                if (!body.name || !body.password) {
                        return new Response(JSON.stringify({ error: 'Both name and password are required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const name = body.name.trim();
                if (guests[name]) {
                        return new Response(JSON.stringify({ error: 'Guest already exists' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const hashedPassword = await sha256(body.password);
                guests[name] = hashedPassword;

                await saveGuests(env, guests);

                const guestNames = Object.keys(guests);
                return new Response(JSON.stringify(guestNames), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'PUT') {
                const body = await request.json() as { name?: string; password?: string };

                if (!body.name || !body.password) {
                        return new Response(JSON.stringify({ error: 'Both name and password are required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const name = body.name.trim();
                if (!guests[name]) {
                        console.log(guests);
                        return new Response(JSON.stringify({ error: 'Guest not found' }), {
                                status: 404,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const hashedPassword = await sha256(body.password);
                guests[name] = hashedPassword;

                await saveGuests(env, guests);

                const guestNames = Object.keys(guests);
                return new Response(JSON.stringify(guestNames), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'DELETE') {
                const body = await request.json() as { name?: string };

                if (!body.name) {
                        return new Response(JSON.stringify({ error: 'Guest name is required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const name = body.name.trim();
                if (!guests[name]) {
                        return new Response(JSON.stringify({ error: 'Guest not found' }), {
                                status: 404,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                delete guests[name];
                await saveGuests(env, guests);

                const guestNames = Object.keys(guests);
                return new Response(JSON.stringify(guestNames), {
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        return new Response('Method Not Allowed', { status: 405 });
}

async function handleQuestionsAPI(request: Request, env: Env): Promise<Response> {
        const questions = await getQuestions(env);

        if (request.method === 'GET') {
                return new Response(JSON.stringify({ questions }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'POST') {
                const body = await request.json() as { id?: string; question?: string };

                if (!body.id || !body.question) {
                        return new Response(JSON.stringify({ error: 'Both id and question are required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                if (questions[body.id]) {
                        return new Response(JSON.stringify({ error: 'Question with this ID already exists' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                questions[body.id] = body.question;
                await saveQuestions(env, questions);

                return new Response(JSON.stringify({ questions }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'PUT') {
                const body = await request.json() as { id?: string; question?: string };

                if (!body.id || !body.question) {
                        return new Response(JSON.stringify({ error: 'Both id and question are required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                if (!questions[body.id]) {
                        return new Response(JSON.stringify({ error: 'Question not found' }), {
                                status: 404,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                questions[body.id] = body.question;
                await saveQuestions(env, questions);

                return new Response(JSON.stringify({ questions }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'DELETE') {
                const body = await request.json() as { id?: string };

                if (!body.id) {
                        return new Response(JSON.stringify({ error: 'Question ID is required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                if (!questions[body.id]) {
                        return new Response(JSON.stringify({ error: 'Question not found' }), {
                                status: 404,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                delete questions[body.id];
                await saveQuestions(env, questions);

                return new Response(JSON.stringify({ questions }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        return new Response('Method Not Allowed', { status: 405 });
}

async function handleGuestAuthAPI(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'POST') {
                return new Response('Method Not Allowed', { status: 405 });
        }

        const body = await request.json() as { name?: string; password?: string };

        if (!body.name || !body.password) {
                return new Response(JSON.stringify({ error: 'Both name and password are required' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        const guests = await getGuests(env);
        const hashedPassword = await sha256(body.password);

        if (!guests[body.name] || guests[body.name] !== hashedPassword) {
                return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        return new Response(JSON.stringify({ success: true, guestName: body.name }), {
                headers: {
                        'Content-Type': 'application/json',
                },
        });
}

async function handleGuestQuestionAPI(request: Request, env: Env): Promise<Response> {
        // Authenticate the guest
        const authenticatedGuest = await verifyGuestCookie(request, env);

        if (!authenticatedGuest) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        const url = new URL(request.url);

        if (request.method === 'GET') {
                let state = await getGuestState(env, authenticatedGuest);
                
                if (!state) {
                        state = await initializeGuestState(env, authenticatedGuest);
                }

                // If currentQuestion or currentGuest is empty/null, get a new question
                if (!state.currentQuestion || !state.currentGuest) {
                        const hasMoreQuestions = await getNextQuestion(env, authenticatedGuest, state);
                        await saveGuestState(env, authenticatedGuest, state);
                        
                        if (!hasMoreQuestions) {
                                return new Response(JSON.stringify({
                                        completed: true,
                                        message: 'You have answered all questions for all guests! Please check back later for new questions.'
                                }), {
                                        headers: { 'Content-Type': 'application/json' },
                                });
                        }
                }

                const questions = await getQuestions(env);
                const currentQuestionText = questions[state.currentQuestion] || 'Question not found';

                return new Response(JSON.stringify({
                        completed: false,
                        currentQuestion: state.currentQuestion,
                        currentQuestionText,
                        currentGuest: state.currentGuest,
                }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } else if (request.method === 'POST') {
                const body = await request.json() as { answer?: string };

                if (!body.answer) {
                        return new Response(JSON.stringify({ error: 'Answer is required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                let state = await getGuestState(env, authenticatedGuest);

                if (!state) {
                        return new Response(JSON.stringify({ error: 'Guest state not found' }), {
                                status: 404,
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                // Save the answer
                if (!state.answers[state.currentGuest]) {
                        state.answers[state.currentGuest] = {};
                }
                state.answers[state.currentGuest][state.currentQuestion] = body.answer;

                // Get next question
                const hasMoreQuestions = await getNextQuestion(env, authenticatedGuest, state);

                await saveGuestState(env, authenticatedGuest, state);

                if (!hasMoreQuestions) {
                        return new Response(JSON.stringify({
                                completed: true,
                                message: 'You have answered all questions for all guests! Please check back later for new questions.'
                        }), {
                                headers: { 'Content-Type': 'application/json' },
                        });
                }

                const questions = await getQuestions(env);
                const currentQuestionText = questions[state.currentQuestion] || 'Question not found';

                return new Response(JSON.stringify({
                        completed: false,
                        currentQuestion: state.currentQuestion,
                        currentQuestionText,
                        currentGuest: state.currentGuest,
                }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        return new Response('Method Not Allowed', { status: 405 });
}

async function handleLeaderboardAPI(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'GET') {
                return new Response('Method Not Allowed', { status: 405 });
        }

        try {
                const guests = await getGuests(env);
                const guestNames = Object.keys(guests);
                
                const leaderboard = [];

                for (const guestName of guestNames) {
                        const state = await getGuestState(env, guestName);
                        
                        let guestsTalkedTo = 0;
                        let totalAnswered = 0;
                        
                        if (state && state.answers) {
                                // Count unique guests talked to
                                guestsTalkedTo = Object.keys(state.answers).length;
                                
                                // Count total answered questions
                                for (const guestAnswers of Object.values(state.answers)) {
                                        totalAnswered += Object.keys(guestAnswers).length;
                                }
                        }
                        
                        leaderboard.push({
                                name: guestName,
                                guestsTalkedTo,
                                totalAnswered
                        });
                }

                // Sort by guests talked to (descending), then by total answered (descending)
                leaderboard.sort((a, b) => {
                        if (b.guestsTalkedTo !== a.guestsTalkedTo) {
                                return b.guestsTalkedTo - a.guestsTalkedTo;
                        }
                        return b.totalAnswered - a.totalAnswered;
                });

                return new Response(JSON.stringify({ leaderboard }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } catch (error) {
                return new Response(JSON.stringify({ error: 'Failed to load leaderboard' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                });
        }
}

async function handleGuestAnswersAPI(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'GET') {
                return new Response('Method Not Allowed', { status: 405 });
        }

        const url = new URL(request.url);
        const targetGuest = url.searchParams.get('guest');

        if (!targetGuest) {
                return new Response(JSON.stringify({ error: 'Guest name is required' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                });
        }

        try {
                const guests = await getGuests(env);
                const questions = await getQuestions(env);
                const guestNames = Object.keys(guests);

                // Collect all answers about the target guest
                const answersByQuestion: Record<string, Array<{ answeredBy: string; answer: string }>> = {};

                for (const guestName of guestNames) {
                        const state = await getGuestState(env, guestName);

                        if (state && state.answers && state.answers[targetGuest]) {
                                const answersAboutTarget = state.answers[targetGuest];

                                for (const [questionId, answer] of Object.entries(answersAboutTarget)) {
                                        if (!answersByQuestion[questionId]) {
                                                answersByQuestion[questionId] = [];
                                        }

                                        answersByQuestion[questionId].push({
                                                answeredBy: guestName,
                                                answer: answer
                                        });
                                }
                        }
                }

                // Build response with question text
                const groupedAnswers = [];
                for (const [questionId, answers] of Object.entries(answersByQuestion)) {
                        groupedAnswers.push({
                                questionId,
                                questionText: questions[questionId] || 'Unknown Question',
                                answers
                        });
                }

                return new Response(JSON.stringify({
                        guestName: targetGuest,
                        questions: groupedAnswers
                }), {
                        headers: { 'Content-Type': 'application/json' },
                });
        } catch (error) {
                return new Response(JSON.stringify({ error: 'Failed to load guest answers' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                });
        }
}

export default {
        async fetch(request, env, ctx): Promise<Response> {
                const url = new URL(request.url);

                // Handle login endpoint
                if (url.pathname === '/login') {
                        return handleLogin(request, env);
                }

                // Handle guest login endpoint
                if (url.pathname === '/guest-login') {
                        return handleGuestLogin(request, env);
                }

                // Handle guest authentication (no admin auth required)
                if (url.pathname === '/api/guest-auth') {
                        return handleGuestAuthAPI(request, env);
                }

                // Handle guest questions (no admin auth required)
                if (url.pathname === '/api/guest-question') {
                        return handleGuestQuestionAPI(request, env);
                }

                // Apply authentication middleware
                return requireAuth(request, env, async () => {
                        // Handle API routes
                        if (url.pathname === '/api/guests') {
                                return handleGuestsAPI(request, env);
                        }

                        if (url.pathname === '/api/questions') {
                                return handleQuestionsAPI(request, env);
                        }

                        if (url.pathname === '/api/leaderboard') {
                                return handleLeaderboardAPI(request, env);
                        }

                        if (url.pathname === '/api/guest-answers') {
                                return handleGuestAnswersAPI(request, env);
                        }

                        // Serve static assets
                        return env.ASSETS.fetch(request);
                });
        },
} satisfies ExportedHandler<Env>;

