import { Welcome } from '../welcome/welcome';

import type { JSX } from 'react';
import type { Route } from './+types/home';

export function meta(): Route.MetaDescriptors {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
}

export default function Home(): JSX.Element {
  return <Welcome />;
}
