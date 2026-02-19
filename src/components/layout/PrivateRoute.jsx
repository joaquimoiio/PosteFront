import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function PrivateRoute({ allowedTenants }) {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn) return <Navigate to="/" replace />;

  if (allowedTenants && !allowedTenants.includes(user.tenant)) {
    const redirectMap = {
      vermelho:  '/vermelho/dashboard',
      branco:    '/branco/dashboard',
      jefferson: '/jefferson/dashboard',
    };
    return <Navigate to={redirectMap[user.tenant] || '/'} replace />;
  }

  return <Outlet />;
}
