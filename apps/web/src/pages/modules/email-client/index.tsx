import { Navigate } from 'react-router-dom';

import { useEmailClientNavigation } from '@/lib/hooks/use-email-client-navigation';

// Default redirect to inbox
export default function EmailClientIndex() {
  const emailNav = useEmailClientNavigation();
  return <Navigate to={emailNav.getInboxPath()} replace />;
}
