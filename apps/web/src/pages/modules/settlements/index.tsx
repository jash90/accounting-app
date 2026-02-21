import { Navigate } from 'react-router-dom';

import { useModuleBasePath } from '@/lib/hooks/use-module-base-path';

export default function SettlementsIndexPage() {
  const basePath = useModuleBasePath('settlements');
  return <Navigate to={basePath} replace />;
}
