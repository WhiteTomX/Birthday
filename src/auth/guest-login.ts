import { AUTH_COOKIE_MAX_AGE } from './constants';
import { generateGuestCookieValue, verifyGuestCookie } from './utils';

export function getGuestLoginTemplate(redirect: string, withError: boolean = false): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guest Login - Birthday Pages</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
        }
        h1 {
            margin: 0 0 30px 0;
            color: #333;
            text-align: center;
        }
        .error {
            background: #fee;
            color: #c33;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 20px;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            color: #555;
            font-weight: bold;
        }
        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
            box-sizing: border-box;
        }
        input[type="text"]:focus,
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>🎂 Guest Login</h1>
        ${withError ? '<div class="error">Invalid credentials. Please try again.</div>' : ''}
        <form method="POST" action="/guest-login">
            <input type="hidden" name="redirect" value="${redirect}" />
            <div class="form-group">
                <label for="name">Guest Name</label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    autofocus 
                    autocomplete="username"
                />
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    required 
                    autocomplete="current-password"
                />
            </div>
            <button type="submit">Login</button>
        </form>
    </div>
</body>
</html>`;
}

export async function handleGuestLogin(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const redirect = url.searchParams.get('redirect') || '/answer.html';
    const error = url.searchParams.get('error');

    if (request.method === 'GET') {
        return new Response(getGuestLoginTemplate(redirect, error === '1'), {
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
    const name = formData.get('name')?.toString() || '';
    const password = formData.get('password')?.toString() || '';
    const redirectPath = formData.get('redirect')?.toString() || '/answer.html';

    if (!name || !password) {
        return new Response('', {
            status: 302,
            headers: {
                'Cache-Control': 'no-cache',
                Location: `/guest-login?redirect=${encodeURIComponent(redirectPath)}&error=1`,
            },
        });
    }

    const cookieKeyValue = await generateGuestCookieValue(name, password);

    return new Response('', {
        status: 302,
        headers: {
            'Set-Cookie': `${cookieKeyValue}; Max-Age=${AUTH_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Strict`,
            'Cache-Control': 'no-cache',
            Location: redirectPath,
        },
    });
}
