import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/authenticated.tsx', [index('routes/home.tsx')]),
  route('login', 'routes/login.tsx'),
  route('api/login', 'routes/api.login.ts'),
] satisfies RouteConfig;
