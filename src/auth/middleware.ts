import { PROTECTED_PATHS } from './constants';
import { getCookieKeyValue } from './utils';
import { getLoginTemplate } from './template';

export async function requireAuth(
	request: Request,
	env: Env,
	next: () => Promise<Response>
): Promise<Response> {
	const url = new URL(request.url);
	const { pathname, searchParams } = url;
	const error = searchParams.get('error');
	const cookie = request.headers.get('cookie') || '';
	const cookieKeyValue = await getCookieKeyValue(env.GUESTS_PASSWORD);

	const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

	if (
		!isProtected ||
		cookie.includes(cookieKeyValue) ||
		pathname === '/login' ||
		!env.GUESTS_PASSWORD
	) {
		return await next();
	} else {
		return new Response(getLoginTemplate(pathname, error === '1'), {
			headers: {
				'content-type': 'text/html',
				'cache-control': 'no-cache',
			},
			status: 401,
		});
	}
}
