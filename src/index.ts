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
import { sha256 } from './auth/utils';

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
		throw new Error('No questions or guests available');
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
		// All questions for all guests have been answered
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

	return new Response(JSON.stringify({ success: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
}

async function handleGuestQuestionAPI(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	
	if (request.method === 'GET') {
		const guestName = url.searchParams.get('guest');
		
		if (!guestName) {
			return new Response(JSON.stringify({ error: 'Guest name is required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let state = await getGuestState(env, guestName);
		
		if (!state) {
			state = await initializeGuestState(env, guestName);
		}

		const questions = await getQuestions(env);
		const currentQuestionText = questions[state.currentQuestion] || 'Question not found';

		return new Response(JSON.stringify({
			currentQuestion: state.currentQuestion,
			currentQuestionText,
			currentGuest: state.currentGuest,
		}), {
			headers: { 'Content-Type': 'application/json' },
		});
	} else if (request.method === 'POST') {
		const body = await request.json() as { guest?: string; answer?: string };
		
		if (!body.guest || !body.answer) {
			return new Response(JSON.stringify({ error: 'Guest name and answer are required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let state = await getGuestState(env, body.guest);
		
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
		const hasMoreQuestions = await getNextQuestion(env, body.guest, state);
		
		await saveGuestState(env, body.guest, state);

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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle login endpoint
		if (url.pathname === '/login') {
			return handleLogin(request, env);
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

			// Serve static assets
			return env.ASSETS.fetch(request);
		});
	},
} satisfies ExportedHandler<Env>;
