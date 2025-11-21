import { useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import paper from 'paper';
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
  const rightCanvasRef = useRef(null);

  // Simplified Paper.js animation for right side
  useEffect(() => {
    if (!rightCanvasRef.current) return;

    paper.setup(rightCanvasRef.current);

    let shapeGroup = new paper.Group();
    let dotsGroup = new paper.Group();

    // Dot class for animation
    class AnimatedDot {
      constructor(path) {
        this.path = path;
        this.offset = Math.random();
        this.speed = 0.0005 + Math.random() * 0.001;
        this.pulseOffset = Math.random() * Math.PI * 2;

        const startPoint = path.getPointAt(this.offset * path.length);

        this.circle = new paper.Path.Circle({
          center: startPoint || path.position,
          radius: 3,
          fillColor: '#0070FF'
        });

        dotsGroup.addChild(this.circle);
      }

      update(frame) {
        this.offset += this.speed;
        if (this.offset > 1) this.offset = 0;

        const point = this.path.getPointAt(this.offset * this.path.length);
        if (point) {
          this.circle.position = point;
          const pulse = 5 + Math.sin(frame * 0.05 + this.pulseOffset) * 1;
          this.circle.scale(pulse / this.circle.bounds.width);
        }
      }

      remove() {
        this.circle.remove();
      }
    }

    let dots = [];

    const initializeShapes = () => {
      const canvasWidth = paper.view.size.width;
      const canvasHeight = paper.view.size.height;

      // Just 3 simple shapes - positioned on the right side
      const positions = [
        { x: canvasWidth - 120, y: 80 },
        { x: canvasWidth - 140, y: canvasHeight / 2 },
        { x: canvasWidth - 100, y: canvasHeight - 80 }
      ];

      const shapePathData = [
        'M 50 100 L 200 120 L 180 50 Z',
        'M0,0l64,100L29,150l200,15L180,20l-80,2L0,0z',
        'M 80 50 L 150 80 L 120 30 Z'
      ];

      shapePathData.forEach((pathData, i) => {
        const shape = new paper.Path({
          strokeColor: '#0070FF',
          strokeWidth: 1.5,
          pathData: pathData
        });
        shape.scale(1.2);
        shape.position = positions[i];
        shapeGroup.addChild(shape);

        // Create 2-3 dots per shape
        const numDots = Math.floor(Math.random() * 2) + 2;
        for (let j = 0; j < numDots; j++) {
          dots.push(new AnimatedDot(shape));
        }
      });
    };

    initializeShapes();

    paper.view.onFrame = (event) => {
      // Rotate shapes slowly
      if (event.count % 4 === 0) {
        shapeGroup.children.forEach((child, i) => {
          if (i % 2 === 0) {
            child.rotate(-0.08);
          } else {
            child.rotate(0.08);
          }
        });
      }

      // Update dots
      dots.forEach(dot => dot.update(event.count));
    };

    return () => {
      dots.forEach(dot => dot.remove());
      if (paper.project) {
        paper.project.remove();
      }
    };
  }, []);

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
            <canvas ref={rightCanvasRef} className="right-canvas"></canvas>
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

                <div className="icon" style={{backgroundImage: 'url(/V2XLogo.png)'}}></div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Login;