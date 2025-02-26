import { useContext, useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import * as Tone from "tone";
import { uploadRecording } from "../api";
import LibraryContext from "../LibraryContext";
import useMic from "@hooks/useMic";

const Recorder = () => {
  const { addSoundToLibrary } = useContext(LibraryContext);

  const { state: micState, states: micStates, openMic } = useMic();

  const recorderRef = useRef(null);
  useEffect(() => {
    const recorder = new Tone.Recorder();
    recorderRef.current = recorder;
    return () => {
      recorderRef.current.dispose();
    }
  }, []);
  useEffect(() => {
    if (micState !== micStates.GRANTED) return;
    let mic;
    (async() => {
      mic = await openMic();
      Tone.connect(mic, recorderRef.current);
    })
    return () => mic ? Tone.disconnect(mic, recorderRef.current) : undefined;
  }, [micState]);

  const states = {
    LOADING: 'loading',
    BLOCKED: 'blocked',
    PROMPT: 'prompt',
    ARMED: "armed",
    RECORDING: "recording",
    SAVING: "saving"
  }
  const micStateToRecorderState = micState => ({
    [micStates.LOADING]: states.LOADING,
    [micStates.IDLE]: states.LOADING,
    [micStates.OPEN]: states.ARMED,
    [micStates.PROMPT]: states.PROMPT,
    [micStates.BLOCKED]: states.BLOCKED,
  }[micState]);
  const [state, setState] = useState(micStateToRecorderState(micState));
  const isBusy = () => state === states.RECORDING || state === states.SAVING;
  
  const startRecording = async () => {
    setState(states.RECORDING)
    recorderRef.current.start();
  }

  const cancelRecording = () => {
    setState(micStateToRecorderState);
    recorderRef.current.stop();
  }

  const saveRecording = async () => {
    setState(states.SAVING);
    const recording = await recorderRef.current.stop();
    setState(micStateToRecorderState);
    const newSoundMetadata = await uploadRecording(recording);
    addSoundToLibrary(newSoundMetadata);
  }

  if (!isBusy() && state !== micStateToRecorderState(micState)) setState(micStateToRecorderState(micState));
  if (state === states.RECORDING && micState !== micStates.OPEN) cancelRecording();// if permission changed

  const onPointerDown = () => {
    if (state === states.ARMED) startRecording();
  }

  const onPointerUp = () => {
    if (state === states.PROMPT) openMic();
    if (state === states.RECORDING) saveRecording();
  }
  
  const bind = useDrag(({ first, last }) => {
    if (first) onPointerDown();
    if (last) onPointerUp();
  });
  
  return <div {...bind()} className={`${state === states.RECORDING? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}>{state}</div>
}
export default Recorder;
