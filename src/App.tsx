import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import ProfessionalApplication from './components/ProfessionalApplication';
import { AdminModule } from './modules/admin/AdminModule';
import { ProfessionalModule } from './modules/professional/ProfessionalModule';
import { ClientModule } from './modules/client/ClientModule';
import { InstallPWAPrompt } from './components/InstallPWAPrompt';

function AppContent() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showProfessionalApplication, setShowProfessionalApplication] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showProfessionalApplication) {
      return <ProfessionalApplication onBack={() => setShowProfessionalApplication(false)} />;
    }

    if (showForgotPassword) {
      return (
        <ForgotPassword
          onBackToLogin={() => {
            setShowForgotPassword(false);
            setShowRegister(false);
          }}
        />
      );
    }

    return showRegister ? (
      <Register onLoginClick={() => setShowRegister(false)} />
    ) : (
      <Login
        onRegisterClick={() => setShowRegister(true)}
        onProfessionalClick={() => setShowProfessionalApplication(true)}
        onForgotPasswordClick={() => setShowForgotPassword(true)}
      />
    );
  }

  switch (user.role) {
    case 'admin':
      return <AdminModule />;
    case 'professional':
      return <ProfessionalModule />;
    case 'client':
      return <ClientModule />;
    default:
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <p className="text-gray-600">Tipo de usuário inválido</p>
        </div>
      );
  }
}

function App() {
  return (
    <AuthProvider>
      <InstallPWAPrompt />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
