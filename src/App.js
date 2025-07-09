import Footer from './components/Footer';
import BookingBoard from './components/BookingBoard';

function App() {
  return (
    <div className="App min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <BookingBoard />
      </main>
      <Footer />
    </div>
  );
}

export default App;
