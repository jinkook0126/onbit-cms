import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/authenticated.tsx', [
    index('routes/section.tsx', { id: 'today' }),
    route('customers', 'routes/customers.tsx', { id: 'customers' }, [
      index('routes/customers-index.tsx', { id: 'customers-index' }),
      route(':customerId', 'routes/customer.tsx', { id: 'customer' }),
    ]),
    route('cases', 'routes/cases.tsx', { id: 'cases' }),
    route('receivables', 'routes/section.tsx', { id: 'receivables' }),
    route('settlements', 'routes/settlements.tsx', { id: 'settlements' }),
    route('settings', 'routes/settings.tsx', { id: 'settings' }, [
      index('routes/settings-index.tsx', { id: 'settings-index' }),
      route('companies', 'routes/settings-companies.tsx', { id: 'settings-companies' }, [
        index('routes/settings-companies-index.tsx', { id: 'settings-companies-index' }),
        route(':companyId', 'routes/settings-company.tsx', { id: 'settings-company' }),
      ]),
      route('teams', 'routes/settings-teams.tsx', { id: 'settings-teams' }, [
        index('routes/settings-teams-index.tsx', { id: 'settings-teams-index' }),
        route(':teamId', 'routes/settings-team.tsx', { id: 'settings-team' }),
      ]),
      route('employees', 'routes/settings-employees.tsx', { id: 'settings-employees' }),
      route('account', 'routes/settings-account.tsx', { id: 'settings-account' }),
    ]),
  ]),
  route('login', 'routes/login.tsx'),
  route('api/login', 'routes/api.login.ts'),
  route('api/logout', 'routes/api.logout.ts'),
  route('api/account', 'routes/api.account.ts'),
  route('api/cases', 'routes/api.cases.ts'),
  route('api/settlements', 'routes/api.settlements.ts'),
  route('api/customers', 'routes/api.customers.ts'),
  route('api/customers/assignees', 'routes/api.customer-assignees.ts'),
  route(
    'api/customers/:customerId/consultations/:consultationId',
    'routes/api.customer-consultation.ts',
  ),
  route('api/customers/:customerId/consultations', 'routes/api.customer-consultations.ts'),
  route(
    'api/customers/:customerId/installment-payments',
    'routes/api.customer-installment-payment.ts',
  ),
  route(
    'api/customers/:customerId/installments/:installmentId',
    'routes/api.customer-installment.ts',
  ),
  route('api/customers/:customerId/installments', 'routes/api.customer-installments.ts'),
  route('api/customers/:customerId/case-progress', 'routes/api.customer-case-progress.ts'),
  route('api/customers/:customerId/ledger', 'routes/api.customer-ledger.ts'),
  route('api/customers/:customerId/refunds', 'routes/api.customer-refund.ts'),
  route('api/customers/:customerId/retain', 'routes/api.customer-retain.ts'),
  route('api/customers/:customerId/summary', 'routes/api.customer-summary.ts'),
  route('api/customers/:customerId', 'routes/api.customer.ts'),
  route('api/companies', 'routes/api.companies.ts'),
  route('api/companies/:companyId', 'routes/api.company.ts'),
  route('api/companies/:companyId/master', 'routes/api.company-master.ts'),
  route('api/teams', 'routes/api.teams.ts'),
  route('api/employees', 'routes/api.employees.ts'),
  route('api/employees/:employeeId', 'routes/api.employee.ts'),
  route('api/teams/:teamId', 'routes/api.team.ts'),
  route('api/account/password', 'routes/api.account-password.ts'),
] satisfies RouteConfig;
