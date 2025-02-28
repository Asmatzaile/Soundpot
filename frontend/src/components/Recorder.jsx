import { useContext, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import LibraryContext from "@context/LibraryContext";
import useMic from "@hooks/useMic";
import { getElementCenter, isSelectorInPoint } from "@utils/dom";

const Recorder = ({ instanceManager }) => {
  const { addSoundToLibrary } = useContext(LibraryContext);

  const { state: micState, states: micStates, openMic, mic } = useMic();

  const recorderRef = useRef(null);
  useEffect(() => {
    const recorder = new Tone.Recorder();
    recorderRef.current = recorder;
    return () => {
      recorderRef.current.dispose();
    }
  }, []);
  useEffect(() => {
    if (micState !== micStates.OPEN) return;
    Tone.connect(mic, recorderRef.current);
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
  const statesRef = useRef({state, micState});// because of document.addEventListener in statRecording. TODO: is there a better way?
  statesRef.current = {state, micState};
  const isBusy = () => state === states.RECORDING || state === states.SAVING;

  const divRef = useRef(null);
  
  const instanceKeyRef = useRef();
  const startRecording = async (e) => {
    setState(states.RECORDING)
    recorderRef.current.start();

    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    const creationEvent = instanceManager.creationEvents.RECORDER;
    Object.assign(creationEvent, e);
    instanceKeyRef.current = instanceManager.add({ pos, creationEvent });
    document.addEventListener("pointerup", onPointerUp, {once: true})
  }

  const stopRecording = () => {
    if (statesRef.current.state === states.RECORDING) recorderRef.current.stop();
    setState(micStateToRecorderState(statesRef.current.micState));
    instanceKeyRef.current = undefined;
  }

  const cancelRecording = () => {
    const instanceKey = instanceKeyRef.current;
    stopRecording();
    if (instanceKey === undefined) return;
    instanceManager.remove(instanceKey)
  }

  const saveRecording = async () => {
    setState(states.SAVING);
    const recording = await recorderRef.current.stop();
    const instanceKey = instanceKeyRef.current;
    const newSoundName = await addSoundToLibrary(recording, "recording");
    const instance = instanceManager.instances.get(instanceKey);
    if (instance) { // if it was left inside the pot
      instance.soundName = newSoundName;
      instanceManager.update(instanceKey, instance);
    }
    stopRecording();
  }

  if (!isBusy() && state !== micStateToRecorderState(micState)) setState(micStateToRecorderState(micState));
  if (state === states.RECORDING && micState !== micStates.OPEN) cancelRecording();// if permission changed

  const onPointerDown = (e) => {
    if (state === states.ARMED) startRecording(e);
  }

  const onPointerUp = (e) => {
    const state = statesRef.current.state;
    if (state === states.PROMPT) openMic();
    if (state === states.RECORDING) {
      const { clientX: x, clientY: y} = e;
      if (isSelectorInPoint("#thrash", {x, y})) cancelRecording();
      else saveRecording();
    }
  }
  
  return <div ref={divRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
  className={`${state === states.RECORDING? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}>{state}</div>
}
export default Recorder;
