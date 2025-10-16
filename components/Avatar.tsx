
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
// Fix: Changed 'import type' to a regular import to allow using AIState enum as a value.
import { AIState } from '../types';

// Fix: Add a global declaration for the custom spline-viewer element to avoid JSX errors.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': any;
    }
  }
}

// Define a type for the Spline Viewer element to provide some type safety
interface SplineViewerElement extends HTMLElement {
  emitEvent: (eventName: 'mouseDown' | 'mouseUp' | 'keyDown' | 'keyUp' | 'scroll' | 'lookAt' | 'follow' | 'start' | 'stop', objectId: string) => void;
  getVariable: (variableName: string) => any;
  setVariable: (variableName: string, value: any) => void;
  load: (url: string) => void;
}


interface AvatarProps {
  aiState: AIState;
}

export interface AvatarHandle {
  triggerPose: (animationName: string) => void;
}

const Avatar = forwardRef<AvatarHandle, AvatarProps>(({ aiState }, ref) => {
  const splineViewerRef = useRef<SplineViewerElement | null>(null);
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


  const playAnimation = (animationName: string) => {
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
    triggerPose(animationName: string) {
        playAnimation(animationName);
    }
  }));

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* @ts-ignore */}
      <spline-viewer
        ref={splineViewerRef}
        url="https://prod.spline.design/9LK6Gwpl6dlCY-Jr/scene.splinecode"
        style={{ width: '100%', height: '100%' }}
      >
        {/* @ts-ignore */}
      </spline-viewer>
    </div>
  );
});

Avatar.displayName = 'Avatar';
export default Avatar;

{/* <script type="module" src="https://unpkg.com/@splinetool/viewer@1.10.80/build/spline-viewer.js"></script>
<spline-viewer url="https://prod.spline.design/9LK6Gwpl6dlCY-Jr/scene.splinecode"></spline-viewer> */}