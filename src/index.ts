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

async function getGuests(env: Env): Promise<string[]> {
	const guestsJson = await env.BIRTHDAY_KV.get('guests');
	if (!guestsJson) {
		return [];
	}
	return JSON.parse(guestsJson);
}

async function addGuest(env: Env, name: string): Promise<string[]> {
	const guests = await getGuests(env);
	if (!guests.includes(name)) {
		guests.push(name);
		await env.BIRTHDAY_KV.put('guests', JSON.stringify(guests));
	}
	return guests;
}

async function addMultipleGuests(env: Env, names: string[]): Promise<string[]> {
	const guests = await getGuests(env);
	const newGuests = names.filter(name => name.trim() && !guests.includes(name.trim()));
	
	if (newGuests.length > 0) {
		guests.push(...newGuests.map(name => name.trim()));
		await env.BIRTHDAY_KV.put('guests', JSON.stringify(guests));
	}
	
	return guests;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		
		if (url.pathname === '/api/guests') {
			if (request.method === 'GET') {
				const guests = await getGuests(env);
				return new Response(JSON.stringify({ guests }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} else if (request.method === 'POST') {
				const body = await request.json() as { name?: string; names?: string[] };
				
				// Support both single and multiple guest additions
				if (body.names && Array.isArray(body.names)) {
					// Add multiple guests
					if (body.names.length === 0) {
						return new Response(JSON.stringify({ error: 'Names array cannot be empty' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					const guests = await addMultipleGuests(env, body.names);
					return new Response(JSON.stringify({ guests }), {
						headers: { 'Content-Type': 'application/json' },
					});
				} else if (body.name && typeof body.name === 'string') {
					// Add single guest
					const guests = await addGuest(env, body.name.trim());
					return new Response(JSON.stringify({ guests }), {
						headers: { 'Content-Type': 'application/json' },
					});
				} else {
					return new Response(JSON.stringify({ error: 'Invalid request: provide either "name" or "names"' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
			}
			return new Response('Method Not Allowed', { status: 405 });
		}

		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
