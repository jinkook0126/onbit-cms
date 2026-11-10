import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/authenticated.tsx', [
    index('routes/section.tsx', { id: 'today' }),
    route('customers', 'routes/section.tsx', { id: 'customers' }),
    route('cases', 'routes/section.tsx', { id: 'cases' }),
    route('receivables', 'routes/section.tsx', { id: 'receivables' }),
    route('settlements', 'routes/section.tsx', { id: 'settlements' }),
    route('settings', 'routes/section.tsx', { id: 'settings' }),
  ]),
  route('login', 'routes/login.tsx'),
  route('api/login', 'routes/api.login.ts'),
  route('api/logout', 'routes/api.logout.ts'),
] satisfies RouteConfig;
