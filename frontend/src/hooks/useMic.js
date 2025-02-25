import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export default function useMic() {
  const states = {
    DENIED: 'denied',
    PROMPT: 'prompt',
    GRANTED: 'granted',
    OPEN: 'open',
  }

  const micRef = useRef(null);
  const [state, setState] = useState(states.PROMPT);

  const updateState = (newState) => {
    setState(prev => {
      if (newState === states.PROMPT && prev !== states.PROMPT) return states.DENIED; // you have to reload the page
      return newState;
    })
    if (newState === states.GRANTED) openMic();
  }
  useEffect(() => {
    const controller = new AbortController();
    (async()=> {
      const permissionStatus = (await navigator.permissions.query({ name: 'microphone' }));
      permissionStatus.addEventListener("change", () => updateState(permissionStatus.state), { signal: controller.signal });
      updateState(permissionStatus.state);
    })();

    return () => controller.abort();
  }, []);

  const openMic = async () => {
    if (micRef.current) return micRef.current;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mic = Tone.getContext().createMediaStreamSource(micStream);
      micRef.current = mic;
      updateState(states.OPEN);
      return mic;
    } catch (e) {
      console.error("Error accessing the microphone:", e)
      updateState(states.DENIED);
    }
  }

  return { state, states, openMic }
}
