import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/authenticated.tsx', [
    index('routes/section.tsx', { id: 'today' }),
    route('customers', 'routes/section.tsx', { id: 'customers' }),
    route('cases', 'routes/section.tsx', { id: 'cases' }),
    route('receivables', 'routes/section.tsx', { id: 'receivables' }),
    route('settlements', 'routes/section.tsx', { id: 'settlements' }),
    route('settings', 'routes/settings.tsx', { id: 'settings' }, [
      index('routes/settings-index.tsx', { id: 'settings-index' }),
      route('companies', 'routes/settings-section.tsx', { id: 'settings-companies' }),
      route('teams', 'routes/settings-section.tsx', { id: 'settings-teams' }),
      route('employees', 'routes/settings-section.tsx', { id: 'settings-employees' }),
      route('account', 'routes/settings-section.tsx', { id: 'settings-account' }),
    ]),
  ]),
  route('login', 'routes/login.tsx'),
  route('api/login', 'routes/api.login.ts'),
  route('api/logout', 'routes/api.logout.ts'),
] satisfies RouteConfig;
