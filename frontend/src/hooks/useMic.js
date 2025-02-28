import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export default function useMic() {
  const states = {
    LOADING: 'loading',
    BLOCKED: 'blocked',
    PROMPT: 'prompt',
    IDLE: 'idle',
    OPEN: 'open',
  }

  const permissionStates = {
    DENIED: 'denied',
    PROMPT: 'prompt',
    GRANTED: 'granted',
  }

  const permissionStateToMicState = permissionState => ({
    [permissionStates.DENIED]: states.BLOCKED,
    [permissionStates.PROMPT]: states.PROMPT,
    [permissionStates.GRANTED]: states.IDLE, // also could be states.OPEN, but it is IDLE when changing from another state
  }[permissionState])

  const micRef = useRef(null);
  const micStreamRef = useRef(null);
  const [state, setState] = useState(states.LOADING);

  const updateState = (newState) => {
    setState(prev => {
      if (newState === prev) return prev;
      if (newState === states.PROMPT && prev !== states.LOADING) return states.BLOCKED; // if it was allowed and now it isn't, you have to reload the page
      return newState;
    })
    if (newState === states.IDLE) openMic();
  }
  useEffect(() => {
    const controller = new AbortController();
    (async()=> {
      const permissionStatus = (await navigator.permissions.query({ name: 'microphone' }));
      permissionStatus.addEventListener("change", () => updateState(permissionStatus.state), { signal: controller.signal });
      updateState(permissionStateToMicState(permissionStatus.state));
    })();

    return () => {
      controller.abort();
      closeMic();
    } 
  }, []);

  const openMic = async () => {
    if (micRef.current) return micRef.current;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mic = Tone.getContext().createMediaStreamSource(micStream);
      micStreamRef.current = micStream;
      micRef.current = mic;
      updateState(states.OPEN);
      return mic;
    } catch (e) {
      console.error("Error accessing the microphone:", e)
      updateState(states.BLOCKED);
    }
  }

  const closeMic = () => {
    if (state === states.OPEN) updateState(states.IDLE);
    const micStream = micStreamRef.current;
    if (micStream) micStream.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
    micRef.current = null;
  }

  return { state, states, openMic, get mic() { return micRef.current } }
}
