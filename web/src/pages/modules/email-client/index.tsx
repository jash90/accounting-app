import { Navigate } from 'react-router-dom';

// Default redirect to inbox
export default function EmailClientIndex() {
  return <Navigate to="/modules/email-client/inbox" replace />;
}
