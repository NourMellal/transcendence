/**
 * Parse cookies from Cookie header manually
 * Subject-compliant: No external cookie library used
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
    if (!cookieHeader) {
        return {};
    }

    const cookies: Record<string, string> = {};
    
    // Split by '; ' to get individual cookies
    const cookiePairs = cookieHeader.split('; ');
    
    for (const pair of cookiePairs) {
        const [name, ...valueParts] = pair.split('=');
        if (name && valueParts.length > 0) {
            // Join back in case value contained '='
            cookies[name.trim()] = decodeURIComponent(valueParts.join('=').trim());
        }
    }
    
    return cookies;
}

/**
 * Serialize a cookie into Set-Cookie header format
 */
export function serializeCookie(
    name: string,
    value: string,
    options: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        maxAge?: number;
        path?: string;
        domain?: string;
        expires?: Date;
    } = {}
): string {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    
    if (options.domain) {
        cookie += `; Domain=${options.domain}`;
    }
    
    if (options.path) {
        cookie += `; Path=${options.path}`;
    }
    
    if (options.expires) {
        cookie += `; Expires=${options.expires.toUTCString()}`;
    }
    
    if (options.maxAge !== undefined) {
        cookie += `; Max-Age=${options.maxAge}`;
    }
    
    if (options.httpOnly) {
        cookie += '; HttpOnly';
    }
    
    if (options.secure) {
        cookie += '; Secure';
    }
    
    if (options.sameSite) {
        cookie += `; SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`;
    }
    
    return cookie;
}

/**
 * Create a cookie that expires immediately (for deletion)
 */
export function clearCookie(name: string, options: { path?: string; domain?: string } = {}): string {
    return serializeCookie(name, '', {
        ...options,
        expires: new Date(0), // Thu, 01 Jan 1970 00:00:00 GMT
        maxAge: 0
    });
}