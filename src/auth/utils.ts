import { AUTH_COOKIE_KEY } from './constants';

export async function sha256(str: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
	return Array.prototype.map
		.call(new Uint8Array(buf), (x) => ('00' + x.toString(16)).slice(-2))
		.join('');
}

export async function getCookieKeyValue(password?: string): Promise<string> {
	const hash = await sha256(password || '');
	return `${AUTH_COOKIE_KEY}=${hash}`;
}

export function getCookie(cookieHeader: string, name: string): string | null {
	const cookies = cookieHeader.split(';').map((c) => c.trim());
	for (const cookie of cookies) {
		const [key, value] = cookie.split('=');
		if (key === name) {
			return value;
		}
	}
	return null;
}
