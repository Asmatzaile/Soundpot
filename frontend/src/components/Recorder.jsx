import { useContext, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import LibraryContext from "@context/LibraryContext";
import useMic from "@hooks/useMic";
import { useSettings } from "@context/SettingsContext";
import { getElementCenter, isSelectorInPoint } from "@utils/dom";
import { sleep } from "@utils/misc";
import { MicIcon, MicOffIcon, LoaderCircleIcon } from "lucide-react";
import useDummyInstanceManager from "@hooks/useDummyInstanceManager";

const Recorder = ({ instanceManager }) => {
  const { settings } = useSettings();
  const { addSoundToLibrary } = useContext(LibraryContext);
  const dummyInstance = useDummyInstanceManager(instanceManager);

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
  

  const startRecording = async (e) => {
    setState(states.RECORDING)
    dummyInstance.create(e, {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}, instanceManager.creationEvents.RECORDER);
    document.addEventListener("pointerup", onPointerUp, {once: true}) // because we created the instance. could lead to bugs.
    await sleep(settings.micDelay);
    recorderRef.current.start();
  }

  const stopRecording = () => {
    if (statesRef.current.state === states.RECORDING) recorderRef.current.stop();
    setState(micStateToRecorderState(statesRef.current.micState));
    dummyInstance.forget();
  }

  const cancelRecording = () => {
    dummyInstance.remove();
    stopRecording();
  }

  const saveRecording = async () => {
    setState(states.SAVING);
    await sleep(settings.micDelay)
    const recording = await recorderRef.current.stop();
    const newSoundName = await addSoundToLibrary(recording, { origin: "recording" });
    dummyInstance.updateSoundName(newSoundName);
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
      if (isSelectorInPoint("#trash", {x, y})) cancelRecording();
      else saveRecording();
    }
  }

  const shapeColorClasses = state === states.ARMED ? "rounded-full text-stone-50 border-4"
  : `rounded-3xl text-stone-800 ${isBusy() ? "bg-stone-50" : state === states.BLOCKED ? "bg-stone-600" : "bg-stone-400"}`
  const cursorClass = state === states.ARMED ? "cursor-grab" : state === states.PROMPT ? "cursor-pointer" : "cursor-default";
  
  const iconComponent = (()=> {
    switch (state) {
      case states.BLOCKED:
        return <MicOffIcon />
      case states.LOADING:
      case states.SAVING:
        return <LoaderCircleIcon style={{animation: "rotation 1s linear infinite"}}/>
      default:
        return <MicIcon />
  }
  })();
  return <div ref={divRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp}
  className={`${shapeColorClasses} ${cursorClass} size-16 touch-none grid place-content-center`}>
    { iconComponent }
  </div>
}
export default Recorder;
