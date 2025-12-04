import { useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import paper from 'paper';
import '../styles/auth/login.css';

// Separate form component to isolate re-renders from animations
const SignupForm = memo(({ onSubmit, goToLogin }) => {
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit({ signupEmail, signupUsername, signupPassword });
  }, [signupEmail, signupUsername, signupPassword, onSubmit]);

  return (
    <form id="form-signup" onSubmit={handleSubmit}>
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
  );
});

const LoginForm = memo(({ onSubmit, goToSignUp }) => {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit({ loginUsername, loginPassword });
  }, [loginUsername, loginPassword, onSubmit]);

  return (
    <form id="form-login" onSubmit={handleSubmit}>
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
  );
});

function Login() {
  const [, setIsSignUp] = useState(false);

  const navigate = useNavigate();
  const slideBoxRef = useRef(null);
  const topLayerRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const leftCanvasRef = useRef(null);

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

  // Paper.js animation for left side with collision detection
  useEffect(() => {
    if (!leftCanvasRef.current) return;

    paper.setup(leftCanvasRef.current);

    let shapeGroup = new paper.Group();
    let dotsGroup = new paper.Group();
    let positionArray = [];

    // Dot class for animation
    class AnimatedDot {
      constructor(path) {
        this.path = path;
        this.offset = Math.random();
        this.speed = 0.0005 + Math.random() * 0.001;
        this.pulseOffset = Math.random() * Math.PI * 2;
        this.isColliding = false;

        // Start at random position on path
        const startPoint = path.getPointAt(this.offset * path.length);

        this.circle = new paper.Path.Circle({
          center: startPoint || path.position,
          radius: 4,
          fillColor: '#e0aa0f'
        });

        dotsGroup.addChild(this.circle);
      }

      update(frame) {
        // Continue moving even when colliding (just marked for removal)
        this.offset += this.speed;
        if (this.offset > 1) this.offset = 0;

        const point = this.path.getPointAt(this.offset * this.path.length);
        if (point) {
          this.circle.position = point;

          // Pulse effect
          const pulse = 6 + Math.sin(frame * 0.05 + this.pulseOffset) * 1.5;
          this.circle.scale(pulse / this.circle.bounds.width);
        }
      }

      collideWith(otherDot) {
        if (this.isColliding || otherDot.isColliding) return false;

        const distance = this.circle.position.getDistance(otherDot.circle.position);
        if (distance < 8) {
          this.isColliding = true;
          otherDot.isColliding = true;

          // Create red collision effect
          const collisionDot = new paper.Path.Circle({
            center: this.circle.position,
            radius: 6,
            fillColor: '#ff4444'
          });

          // Animate collision dot
          collisionDot.onFrame = function(event) {
            this.scale(1.1);
            this.opacity -= 0.05;
            if (this.opacity <= 0) {
              this.remove();
            }
          };

          return true;
        }
        return false;
      }

      remove() {
        this.circle.remove();
      }
    }

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

    let dots = [];

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
          strokeColor: '	#FDB736',
          strokeWidth: 1.8,
          pathData: pathData
        });
        shape.scale(2);
        shape.position = positionArray[i];
        shapeGroup.addChild(shape);

        // Create 3-5 dots per shape
        const numDots = Math.floor(Math.random() * 3) + 3;
        for (let j = 0; j < numDots; j++) {
          dots.push(new AnimatedDot(shape));
        }
      });

      if (canvasWidth < 700) {
        shapeGroup.children[3].opacity = 0;
        shapeGroup.children[2].opacity = 0;
        shapeGroup.children[5].opacity = 0;
      }
    };

    initializeShapes();

    paper.view.onFrame = (event) => {
      // Rotate shapes
      if (event.count % 4 === 0) {
        shapeGroup.children.forEach((child, i) => {
          if (i % 2 === 0) {
            child.rotate(-0.1);
          } else {
            child.rotate(0.1);
          }
        });
      }

      // Update dots
      dots.forEach(dot => dot.update(event.count));

      // Check for collisions
      const dotsToRemove = new Set();

      for (let i = 0; i < dots.length; i++) {
        if (!dots[i] || dotsToRemove.has(i)) continue;

        if (dots[i].isColliding) {
          dotsToRemove.add(i);
          continue;
        }

        for (let j = i + 1; j < dots.length; j++) {
          if (!dots[j] || dotsToRemove.has(j)) continue;

          if (dots[i].collideWith(dots[j])) {
            dotsToRemove.add(i);
            dotsToRemove.add(j);
            break;
          }
        }
      }

      // Remove collided dots
      if (dotsToRemove.size > 0) {
        const indices = Array.from(dotsToRemove).sort((a, b) => b - a);
        indices.forEach(index => {
          if (dots[index]) {
            dots[index].remove();
            dots.splice(index, 1);
          }
        });
      }

      // Randomly spawn new dots if count is low
      if (dots.length < 25 && Math.random() < 0.05) {
        const randomShape = shapeGroup.children[Math.floor(Math.random() * shapeGroup.children.length)];
        if (randomShape && randomShape.opacity > 0) {
          dots.push(new AnimatedDot(randomShape));
        }
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

  const handleSignupSubmit = useCallback((data) => {
    console.log('Signup attempted with:', data);
    // Add signup logic here
  }, []);

  const handleLoginSubmit = useCallback((data) => {
    console.log('Login attempted with:', data);
    navigate('/geofencing');
  }, [navigate]);

  return (
    <>
      <div id="back">
        <div className="canvas-back">
          <canvas ref={leftCanvasRef} className="left-canvas"></canvas>
        </div>
        <div className="backRight"></div>
        <div className="backLeft"></div>
      </div>
      <div id="slideBox" ref={slideBoxRef}>
        <div className="topLayer" ref={topLayerRef}>
          <div className="left">
            <div className="content">
              <h2>Sign Up</h2>
              <SignupForm onSubmit={handleSignupSubmit} goToLogin={goToLogin} />
            </div>
          </div>
          <div className="right">
            <canvas ref={rightCanvasRef} className="right-canvas"></canvas>
            <div className="content">
              <h1 style={{color: '#00416A'}}>Login</h1>
              <h2>Prism Dashboard</h2>
              <LoginForm onSubmit={handleLoginSubmit} goToSignUp={goToSignUp} />
            </div>

                <div className="icon" style={{backgroundImage: 'url(/PrismLogo.png)'}}></div>

          </div>
        </div>
      </div>
    </>
  );
}

export default Login;