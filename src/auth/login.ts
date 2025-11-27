import { AUTH_COOKIE_MAX_AGE } from './constants';
import { sha256, getCookieKeyValue } from './utils';
import { getLoginTemplate } from './template';

export async function handleLogin(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const redirect = url.searchParams.get('redirect') || '/';
	const error = url.searchParams.get('error');

	if (request.method === 'GET') {
		return new Response(getLoginTemplate(redirect, error === '1'), {
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'no-cache',
			},
		});
	}

	if (request.method !== 'POST') {
		return new Response('Method not allowed', { status: 405 });
	}

	const formData = await request.formData();
	const password = formData.get('password')?.toString() || '';
	const redirectPath = formData.get('redirect')?.toString() || '/';

	const hashedPassword = await sha256(password);
	const hashedEnvPassword = await sha256(env.GUESTS_PASSWORD || '');

	if (hashedPassword === hashedEnvPassword) {
		const cookieKeyValue = await getCookieKeyValue(env.GUESTS_PASSWORD);

		return new Response('', {
			status: 302,
			headers: {
				'Set-Cookie': `${cookieKeyValue}; Max-Age=${AUTH_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`,
				'Cache-Control': 'no-cache',
				Location: redirectPath,
			},
		});
	} else {
		return new Response('', {
			status: 302,
			headers: {
				'Cache-Control': 'no-cache',
				Location: `${redirectPath}?error=1`,
			},
		});
	}
}
