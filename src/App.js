import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Footer from './components/Footer';
import BookingBoard from './components/BookingBoard';
import DashboardPage from './components/DashboardPage';
import LoginForm from './components/auth/LoginForm';
import ProcurementRequisitionForm from './components/ProcurementRequisitionForm';

// Protected Route Component - let BookingBoard handle its own auth flow
const ProtectedRoute = ({ children }) => {
  return children;
};

// Public Route Component (redirects if authenticated)
const PublicRoute = ({ children }) => {
  const { user } = useApp();
  const token = localStorage.getItem('access_token');
  
  if (user || token) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Main App Content
const AppContent = () => {
  return (
    <div className="App min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginForm onSuccess={() => window.location.href = '/'} />
              </PublicRoute>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <BookingBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/procurement" 
            element={
              <ProtectedRoute>
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="max-w-4xl w-full">
                    <ProcurementRequisitionForm />
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;
