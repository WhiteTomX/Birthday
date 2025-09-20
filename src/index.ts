function unauthorizedResponse() {
	const html = `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Authentifizierung erforderlich</title>
	<style>
		body {
			background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
			font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
			margin: 0;
			padding: 0;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.container {
			background: #fff;
			border-radius: 1.5rem;
			box-shadow: 0 4px 24px rgba(0,0,0,0.08);
			padding: 2.5rem 2rem;
			max-width: 420px;
			width: 100%;
			text-align: center;
		}
		h1 {
			color: #e11d48;
			margin-bottom: 1.2rem;
			font-size: 1.7rem;
		}
		.info {
			color: #22223b;
			font-size: 1.1rem;
			margin-bottom: 1.2rem;
			line-height: 1.6;
		}
		.hint {
			color: #4f46e5;
			font-size: 1.05rem;
			margin-top: 1.5rem;
		}
		@media (max-width: 600px) {
			.container {
				padding: 1.2rem 0.5rem;
			}
			h1 {
				font-size: 1.2rem;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Authentifizierung erforderlich</h1>
		<div class="info">
			<p>Um diese Seite zu sehen, bitte anmelden.</p>
			<div class="hint">
				<b>Hinweis:</b><br>
				Der Benutzername ist mein Name mit großem Anfangsbuchstaben.<br>
				Das Passwort ist mein Geburtstag im Format <b>tt.mm.jjjj</b>.<br>
				<span style="color:#6b7280;font-size:0.95em;">(Beispiel: 15.10.1960)</span>
			</div>
		</div>
	</div>
</body>
</html>`;
	return new Response(html, {
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
		const html = `<!DOCTYPE html>
<html lang="de">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Geburtstagseinladung</title>
	<style>
		body {
			background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
			font-family: 'Segoe UI', 'Roboto', Arial, sans-serif;
			margin: 0;
			padding: 0;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.container {
			background: #fff;
			border-radius: 1.5rem;
			box-shadow: 0 4px 24px rgba(0,0,0,0.08);
			padding: 2.5rem 2rem;
			max-width: 420px;
			width: 100%;
			text-align: center;
		}
		h1 {
			color: #4f46e5;
			margin-bottom: 1.2rem;
			font-size: 2rem;
		}
		.info {
			color: #22223b;
			font-size: 1.15rem;
			margin-bottom: 1.2rem;
			line-height: 1.6;
		}
		.footer {
			color: #6b7280;
			font-size: 0.95rem;
			margin-top: 2rem;
		}
		@media (max-width: 600px) {
			.container {
				padding: 1.2rem 0.5rem;
			}
			h1 {
				font-size: 1.3rem;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Geburtstagseinladung</h1>
		<div class="info">
			<p>🎉 Reinfeiern vom <b>29.11</b> auf den <b>30.11</b></p>
			<p>Wie letztes Jahr gibt es einen <b>Livestandort</b> am Samstag und am Sonntag.</p>
			<p>Einfach dazustoßen!</p>
		</div>
		<div class="footer">
			Ich freue mich auf euch!<br>
			<span style="font-size:1.2em;">🥳</span>
		</div>
	</div>
</body>
</html>`;
		return new Response(html, {
			headers: {
				'content-type': 'text/html; charset=UTF-8',
			},
		});
	},
} satisfies ExportedHandler<Env>;
