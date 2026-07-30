import { Route, Routes } from 'react-router-dom';
import { useCurrentUser } from './hooks/useCurrentUser';
import { ForcePasswordChangeScreen } from './components/layout/ForcePasswordChangeScreen';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { ModelPage } from './pages/model/ModelPage';
import { EnginePage } from './pages/engine/EnginePage';
import { AdminPage } from './pages/admin/AdminPage';

function App() {
  const user = useCurrentUser();

  if (user.status === 'ready' && user.profile.must_change_password) {
    return <ForcePasswordChangeScreen userId={user.userId} />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/model" element={<ModelPage />} />
      <Route path="/engine" element={<EnginePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

export default App;
