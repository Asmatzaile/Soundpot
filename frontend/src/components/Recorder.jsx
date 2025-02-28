import { useContext, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { uploadSound } from "../api";
import LibraryContext from "@context/LibraryContext";
import useMic from "@hooks/useMic";
import { getElementCenter } from "@utils/dom";

const Recorder = ({ instanceManager }) => {
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

  const divRef = useRef(null);
  
  const instanceKeyRef = useRef();
  const startRecording = async (e) => {
    setState(states.RECORDING)
    recorderRef.current.start();

    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    const creationEvent = instanceManager.creationEvents.RECORDER;
    Object.assign(creationEvent, e);
    instanceKeyRef.current = instanceManager.add({ pos, creationEvent });
    document.addEventListener("pointerup", () => onPointerUp(), {once: true})
  }

  const stopRecording = () => {
    if (state === states.RECORDING) recorderRef.current.stop();
    setState(micStateToRecorderState);
    instanceKeyRef.current = undefined;
  }

  const cancelRecording = () => {
    const instanceKey = instanceKeyRef.current;
    stopRecording();
    if (recordingInstance === undefined) return;
    instanceManager.remove(instanceKey)
  }

  const saveRecording = async () => {
    setState(states.SAVING);
    const recording = await recorderRef.current.stop();
    const instanceKey = instanceKeyRef.current;
    stopRecording();
    const newSoundMetadata = await uploadSound(recording, "recording");
    addSoundToLibrary(newSoundMetadata);
    const instance = instanceManager.instances.get(instanceKey);
    instance.soundName = newSoundMetadata[0];
    instanceManager.update(instanceKey, instance);
  }

  if (!isBusy() && state !== micStateToRecorderState(micState)) setState(micStateToRecorderState(micState));
  if (state === states.RECORDING && micState !== micStates.OPEN) cancelRecording();// if permission changed

  const onPointerDown = (e) => {
    if (state === states.ARMED) startRecording(e);
  }

  const stateRef = useRef(state);
  stateRef.current = state;
  const onPointerUp = () => {
    if (stateRef.current === states.PROMPT) openMic();
    if (stateRef.current === states.RECORDING) saveRecording(); // because of document.addEventListener in statRecording. TODO: is there a better way?
  }
  
  return <div ref={divRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
  className={`${state === states.RECORDING? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}>{state}</div>
}
export default Recorder;
