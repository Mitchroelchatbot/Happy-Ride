import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Alles behalve API-routes, Next-interne bestanden en bestanden met een extensie.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
