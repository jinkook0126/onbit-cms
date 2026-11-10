import { SettingsPage } from '~/features/settings/components/SettingsPage';

import type { JSX } from 'react';
import type { Route } from './+types/settings-index';

export function meta(): Route.MetaDescriptors {
  return [{ title: '설정 | 온빛 CMS' }];
}

export default function SettingsIndex(): JSX.Element {
  return <SettingsPage />;
}
