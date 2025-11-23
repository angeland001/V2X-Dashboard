import React, { useEffect, useRef } from 'react';
import './Terminal.css';

function Terminal() {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = terminalRef.current;
    const commands = [
      { text: '$ initializing v2x dashboard...', delay: 100 },
      { text: 'Loading modules...', delay: 800 },
      { text: '[OK] Authentication module', delay: 1200 },
      { text: '[OK] Data visualization engine', delay: 1600 },
      { text: '[OK] Real-time communication protocol', delay: 2000 },
      { text: '[OK] Geospatial analysis toolkit', delay: 2400 },
      { text: 'System ready. Awaiting credentials...', delay: 2800 },
      { text: '$ _', delay: 3200, cursor: true }
    ];

    let timeouts = [];

    commands.forEach((cmd, index) => {
      const timeout = setTimeout(() => {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        if (cmd.cursor) {
          line.classList.add('cursor-blink');
        }
        line.textContent = cmd.text;
        terminal.appendChild(line);

        // Scroll to bottom
        terminal.scrollTop = terminal.scrollHeight;
      }, cmd.delay);

      timeouts.push(timeout);
    });

    // Add floating code particles
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'code-particle';
      particle.textContent = ['0', '1', '{', '}', '<', '>', '$', '#'][Math.floor(Math.random() * 8)];
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (3 + Math.random() * 4) + 's';
      particle.style.opacity = Math.random() * 0.3 + 0.1;
      terminal.appendChild(particle);

      setTimeout(() => {
        particle.remove();
      }, 7000);
    };

    const particleInterval = setInterval(createParticle, 500);
    timeouts.push(particleInterval);

    return () => {
      timeouts.forEach(t => clearTimeout(t));
      clearInterval(particleInterval);
    };
  }, []);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-buttons">
          <span className="terminal-button close"></span>
          <span className="terminal-button minimize"></span>
          <span className="terminal-button maximize"></span>
        </div>
        <div className="terminal-title">v2x-dashboard@terminal:~</div>
      </div>
      <div className="terminal-body" ref={terminalRef}></div>
    </div>
  );
}

export default Terminal;
