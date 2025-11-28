import { AUTH_COOKIE_KEY, GUEST_AUTH_COOKIE_KEY } from './constants';

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

export async function generateGuestCookieValue(guestName: string, password: string): Promise<string> {
	const hashedPassword = await sha256(password);
	const cookieData = {
		name: guestName,
		hash: hashedPassword
	};
	const base64Data = btoa(JSON.stringify(cookieData));
	return `${GUEST_AUTH_COOKIE_KEY}=${base64Data}`;
}

export async function verifyGuestCookie(request: Request, env: Env): Promise<string | null> {
	const cookieHeader = request.headers.get('cookie') || '';
	const guestCookie = getCookie(cookieHeader, GUEST_AUTH_COOKIE_KEY);

	if (!guestCookie) {
		console.log('No guest cookie found');
		return null;
	}

	try {
		// Decode base64 cookie
		const cookieData = JSON.parse(atob(guestCookie));
		const guestName = cookieData.name;
		const storedHash = cookieData.hash;

		if (!guestName || !storedHash) {
			return null;
		}

		// Get guests from KV
		const guestsJson = await env.BIRTHDAY_KV.get('guests');
		const guests = guestsJson ? JSON.parse(guestsJson) : {};

		// Verify the guest exists and the hash matches
		if (guests[guestName] && guests[guestName] === storedHash) {
			return guestName;
		}
	} catch (error) {
		// Invalid cookie format
		return null;
	}

	return null;
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
