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

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle login endpoint
		if (url.pathname === '/login') {
			return handleLogin(request, env);
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
