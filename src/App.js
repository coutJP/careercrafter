import logo from './logo.svg';
import './App.css';

import React from 'react';

function App() {
  return (
    <div className="container">
      <header className="header">
        <div className="logo">Life</div>
        <nav className="nav">
          <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#">Organization</a></li>
            <li><a href="#">Preparation</a></li>
            <li><a href="#">Dummy Section</a></li>
          </ul>
          <div className="auth">
            <a href="#">Log in</a>
            <a href="#">Sign up</a>
          </div>
        </nav>
      </header>
      <main className="main">
        <section className="hero">
          <h1>Prepare for your HR interview</h1>
          <p>Get ready for success</p>
          <button>Start now</button>
        </section>
        <section className="services">
          <h2>Learn from the best in HR</h2>
          <ul>
            <li>Expertise</li>
            <li>Professional</li>
            <li>Experience</li>
            <li>Skills</li>
          </ul>
        </section>
      </main>
      <footer className="footer">
        {/* Footer content */}
      </footer>
    </div>
  );
}

export default App;
