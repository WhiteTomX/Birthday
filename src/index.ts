import unauthorizedHtml from './unauthorized.html';
import mainHtml from './main.html';

function unauthorizedResponse() {
	return new Response(unauthorizedHtml, {
		status: 401,
		headers: {
			'WWW-Authenticate': 'Basic realm="Geburtstag", charset="UTF-8"',
			'content-type': 'text/html; charset=UTF-8',
		},
	});
}

function parseBasicAuth(authHeader: string | null): { username: string; password: string } | null {
	if (!authHeader || !authHeader.startsWith('Basic ')) return null;
	try {
		const b64 = authHeader.slice(6);
		const [username, password] = atob(b64).split(':');
		if (!username || !password) return null;
		return { username, password };
	} catch {
		return null;
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Get credentials from KV
		const storedUsername = await env.BIRTHDAY_KV.get('auth_username');
		const storedPassword = await env.BIRTHDAY_KV.get('auth_password');
		if (!storedUsername || !storedPassword) {
			return new Response('Fehler: Zugangsdaten nicht gesetzt.', { status: 500 });
		}

		// Parse Authorization header
		const auth = parseBasicAuth(request.headers.get('Authorization'));
		if (!auth || auth.username !== storedUsername || auth.password !== storedPassword) {
			return unauthorizedResponse();
		}

		// Authenticated: show the site
		return new Response(mainHtml, {
			headers: {
				'content-type': 'text/html; charset=UTF-8',
			},
		});
	},
} satisfies ExportedHandler<Env>;
