import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './UserContext';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import Result from './Result';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    document.title = "Hair-Check";
  }, []);

  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/result" element={<Result />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
