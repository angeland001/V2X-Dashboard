import { useNavigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import Dither from './Dither';
import '../styles/auth/login.css';

function Login() {
  const [, setIsSignUp] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupTerms, setSignupTerms] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const navigate = useNavigate();
  const slideBoxRef = useRef(null);
  const topLayerRef = useRef(null);

  // Toggle animation between signup and login
  const goToSignUp = () => {
    setIsSignUp(true);
    if (slideBoxRef.current && topLayerRef.current) {
      slideBoxRef.current.style.transition = 'margin-left 0.5s ease';
      topLayerRef.current.style.transition = 'margin-left 0.5s ease';
      slideBoxRef.current.style.marginLeft = '0';
      topLayerRef.current.style.marginLeft = '100%';
    }
  };

  const goToLogin = () => {
    setIsSignUp(false);
    if (slideBoxRef.current && topLayerRef.current) {
      slideBoxRef.current.style.transition = 'margin-left 0.5s ease';
      topLayerRef.current.style.transition = 'margin-left 0.5s ease';

      if (window.innerWidth > 769) {
        slideBoxRef.current.style.marginLeft = '50%';
      } else {
        slideBoxRef.current.style.marginLeft = '20%';
      }
      topLayerRef.current.style.marginLeft = '0';
    }
  };

  const handleSignupSubmit = (event) => {
    event.preventDefault();
    console.log('Signup attempted with:', { signupEmail, signupUsername, signupPassword, signupTerms });
    // Add signup logic here
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    console.log('Login attempted with:', { loginUsername, loginPassword });
    navigate('/map');
  };

  return (
    <>
      <div id="back">
        <div className="canvas-back">
          <Dither
            waveColor={[0.2, 0.4, 0.9]}
            waveColor2={[0.99, 0.85, 0.2]}
            disableAnimation={false}
            enableMouseInteraction={true}
            mouseRadius={0.1}
            colorNum={4}
            waveAmplitude={0.3}
            waveFrequency={3}
            waveSpeed={0.05}
          />
        </div>
        <div className="backRight"></div>
        <div className="backLeft"></div>
      </div>
      <div id="slideBox" ref={slideBoxRef}>
        <div className="topLayer" ref={topLayerRef}>
          <div className="left">
            <div className="content">
              <h2>Sign Up</h2>
              <form id="form-signup" onSubmit={handleSignupSubmit}>
                <div className="form-element form-stack">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-element form-stack">
                  <label htmlFor="username-signup" className="form-label">Username</label>
                  <input
                    id="username-signup"
                    type="text"
                    name="username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-element form-stack">
                  <label htmlFor="password-signup" className="form-label">Password</label>
                  <input
                    id="password-signup"
                    type="password"
                    name="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-element form-submit">
                  <button id="signUp" className="signup" type="submit">Sign up</button>
                  <button id="goLeft" className="signup off" type="button" onClick={goToLogin}>Log In</button>
                </div>
              </form>
            </div>
          </div>
          <div className="right">
            <div className="content">
              <h1 style={{color: '#00416A'}}>Login</h1>
              <h2>V2X Dashboard</h2>
              
              <form id="form-login" onSubmit={handleLoginSubmit}>
                <div className="form-element form-stack">
                  <label htmlFor="username-login" className="form-label">Username</label>
                  <input
                    id="username-login"
                    type="text"
                    name="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-element form-stack">
                  <label htmlFor="password-login" className="form-label">Password</label>
                  <input
                    id="password-login"
                    type="password"
                    name="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-element form-submit">
                  <button id="logIn" className="login" type="submit">Log In</button>
                  <button id="goRight" className="login off" type="button" onClick={goToSignUp}>Sign Up</button>
                </div>
              </form>
            </div>
            
                <div className="icon"></div>
              
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;