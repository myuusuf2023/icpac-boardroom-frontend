import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Footer from './components/Footer';
import BookingBoard from './components/BookingBoard';
import DashboardPage from './components/DashboardPage';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App min-h-screen bg-gray-50 flex flex-col">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<BookingBoard />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
