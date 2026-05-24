import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RatingPage from './pages/RatingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/rating" element={<RatingPage scheduleId="eeee3333-eeee-eeee-eeee-eeeeeeeeeeee" reviewerId="44444444-4444-4444-4444-444444444444" />} />
        <Route path="/" element={
          <div>
            <h1>Study Buddy Finder</h1>
            <p><a href="/rating">View Rating Page</a></p>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
