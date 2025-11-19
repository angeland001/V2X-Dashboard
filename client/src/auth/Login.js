import { useHistory } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import paper from 'paper';
import '../styles/auth/login.css';

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupTerms, setSignupTerms] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const history = useHistory();
  const canvasRef = useRef(null);
  const slideBoxRef = useRef(null);
  const topLayerRef = useRef(null);

  // Paper.js animation setup
  useEffect(() => {
    if (!canvasRef.current) return;

    paper.setup(canvasRef.current);

    let shapeGroup = new paper.Group();
    let positionArray = [];

    const getCanvasBounds = () => {
      const canvasWidth = paper.view.size.width;
      const canvasHeight = paper.view.size.height;
      const canvasMiddleX = canvasWidth / 2;
      const canvasMiddleY = canvasHeight / 2;

      positionArray = [
        { x: (canvasMiddleX - 50) + (canvasMiddleX / 2), y: 150 },
        { x: 200, y: canvasMiddleY },
        { x: canvasWidth - 130, y: canvasHeight - 75 },
        { x: 0, y: canvasMiddleY + 100 },
        { x: (canvasMiddleX / 2) + 100, y: 100 },
        { x: canvasMiddleX + 80, y: canvasHeight - 50 },
        { x: canvasWidth + 60, y: canvasMiddleY - 50 },
        { x: canvasMiddleX + 100, y: canvasMiddleY + 100 }
      ];

      return { canvasWidth };
    };

    const initializeShapes = () => {
      const { canvasWidth } = getCanvasBounds();

      const shapePathData = [
        'M231,352l445-156L600,0L452,54L331,3L0,48L231,352',
        'M0,0l64,219L29,343l535,30L478,37l-133,4L0,0z',
        'M0,65l16,138l96,107l270-2L470,0L337,4L0,65z',
        'M333,0L0,94l64,219L29,437l570-151l-196-42L333,0',
        'M331.9,3.6l-331,45l231,304l445-156l-76-196l-148,54L331.9,3.6z',
        'M389,352l92-113l195-43l0,0l0,0L445,48l-80,1L122.7,0L0,275.2L162,297L389,352',
        'M 50 100 L 300 150 L 550 50 L 750 300 L 500 250 L 300 450 L 50 100',
        'M 700 350 L 500 350 L 700 500 L 400 400 L 200 450 L 250 350 L 100 300 L 150 50 L 350 100 L 250 150 L 450 150 L 400 50 L 550 150 L 350 250 L 650 150 L 650 50 L 700 150 L 600 250 L 750 250 L 650 300 L 700 350'
      ];

      shapePathData.forEach((pathData, i) => {
        const shape = new paper.Path({
          strokeColor: 'rgba(255, 255, 255, 0.5)',
          strokeWidth: 2,
          pathData: pathData
        });
        shape.scale(2);
        shape.position = positionArray[i];
        shapeGroup.addChild(shape);
      });

      if (canvasWidth < 700) {
        shapeGroup.children[3].opacity = 0;
        shapeGroup.children[2].opacity = 0;
        shapeGroup.children[5].opacity = 0;
      }
    };

    initializeShapes();

    paper.view.onFrame = (event) => {
      if (event.count % 4 === 0) {
        shapeGroup.children.forEach((child, i) => {
          if (i % 2 === 0) {
            child.rotate(-0.1);
          } else {
            child.rotate(0.1);
          }
        });
      }
    };

    paper.view.onResize = () => {
      const { canvasWidth } = getCanvasBounds();

      shapeGroup.children.forEach((child, i) => {
        child.position = positionArray[i];
      });

      if (canvasWidth < 700) {
        shapeGroup.children[3].opacity = 0;
        shapeGroup.children[2].opacity = 0;
        shapeGroup.children[5].opacity = 0;
      } else {
        shapeGroup.children[3].opacity = 1;
        shapeGroup.children[2].opacity = 1;
        shapeGroup.children[5].opacity = 1;
      }
    };

    return () => {
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
    history.push('/map');
  };

  return (
    <>
      <div id="back">
        <canvas ref={canvasRef} id="canvas" className="canvas-back"></canvas>
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
                <div className="form-element form-checkbox">
                  <input
                    id="confirm-terms"
                    type="checkbox"
                    name="confirm"
                    value="yes"
                    className="checkbox"
                    checked={signupTerms}
                    onChange={(e) => setSignupTerms(e.target.checked)}
                    required
                  />
                  <label htmlFor="confirm-terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
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
              <h2>Login</h2>
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
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;