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

		// Authenticated: show the site with dynamic live location
		const liveLocation = await env.BIRTHDAY_KV.get('live_location');

		let locationHtml = liveLocation
			? `<div style="margin:1.5em 0">
					<a href="${liveLocation}" target="_blank" style="font-size:1.1em;color:#2563eb;word-break:break-all">
						🔗 Livestandort öffnen
					</a><br>
					<span style="color:#6b7280;font-size:0.95em">
						Falls der Link nicht funktioniert, bitte bei mir melden, damit ich ihn aktualisieren kann.
					</span>
				</div>`
			: `<div style="margin:1.5em 0;color:#eab308;font-size:1.05em">
					Livestandort-Link wird rechtzeitig hier erscheinen.
				</div>`;

		const html = mainHtml.replace('<!-- LIVE_LOCATION_PLACEHOLDER -->', locationHtml);

		return new Response(html, {
			headers: {
				'content-type': 'text/html; charset=UTF-8',
			},
		});
	},
} satisfies ExportedHandler<Env>;
