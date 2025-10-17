
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const AIState = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  SPEAKING: 'SPEAKING',
  PAUSED: 'PAUSED',
  SLEEPING: 'SLEEPING',
};

const Avatar = forwardRef(({ aiState }, ref) => {
  const splineViewerRef = useRef(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    const viewer = splineViewerRef.current;
    if (viewer) {
        const onLoad = () => {
            isLoaded.current = true;
            console.log('Spline scene loaded.');
            // Initial idle state
            viewer.emitEvent('start', 'IdleAnimation');
        };
        
        // @ts-ignore Spline viewer events are not in the default HTMLElement type
        viewer.addEventListener('load', onLoad);

        return () => {
            // @ts-ignore
            viewer.removeEventListener('load', onLoad);
        };
    }
  }, []);


  const playAnimation = (animationName) => {
    if (splineViewerRef.current && isLoaded.current) {
        console.log(`Playing animation: ${animationName}`);
        // @ts-ignore
        splineViewerRef.current.emitEvent('start', animationName);
    }
  };

  useEffect(() => {
    switch (aiState) {
      case AIState.IDLE:
        playAnimation('IdleAnimation');
        break;
      case AIState.LISTENING:
        playAnimation('ListeningAnimation');
        break;
      case AIState.THINKING:
        playAnimation('ThinkingAnimation');
        break;
      case AIState.SPEAKING:
        playAnimation('TalkingAnimation');
        break;
      case AIState.SLEEPING:
         playAnimation('SleepingAnimation');
        break;
      default:
        playAnimation('IdleAnimation');
        break;
    }
  }, [aiState]);

  useImperativeHandle(ref, () => ({
    triggerPose(animationName) {
        playAnimation(animationName);
    }
  }));

  return (
    <div className="absolute inset-0 w-full h-full">
      <iframe
        src="https://my.spline.design/untitled-20f3b9c9c83d43d49a6b2595b3b0e9a3/"
        frameBorder="0"
        width="100%"
        height="100%"
        allowFullScreen
      ></iframe>
    </div>
  );
});

Avatar.displayName = 'Avatar';
export default Avatar;

{/* <script type="module" src="https://unpkg.com/@splinetool/viewer@1.10.80/build/spline-viewer.js"></script>
<spline-viewer url="https://prod.spline.design/9LK6Gwpl6dlCY-Jr/scene.splinecode"></spline-viewer> */}