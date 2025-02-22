import { useContext, useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import * as Tone from "tone";
import { uploadRecording } from "../api";
import LibraryContext from "../LibraryContext";

const Recorder = () => {
  const { addSoundToLibrary } = useContext(LibraryContext);
  
  const [isRecording, setIsRecording] = useState(false);
  
  const recorderRef = useRef(null);
  const micRef = useRef(null);
  const micIdRef = useRef(null);
  const micStreamRef = useRef(null);
  
  useEffect(() => {
    const recorder = new Tone.Recorder();
    recorderRef.current = recorder;
    return () => {
      recorderRef.current.dispose();
    }
  }, [])
  
  const saveRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    // closeMic(); // if mic is closed, next recording has to open it and cuts the start!
    const recording = await recorderRef.current.stop();
    const newSoundMetadata = await uploadRecording(recording);
    addSoundToLibrary(newSoundMetadata);
  }
  
  const openMic = async () => {
    if (micRef.current) return true;
    const recordingPermission = (await navigator.permissions.query({ name: 'microphone' })).state;
    const prevMicId = micIdRef.current;
    try {
      const constraints = prevMicId ? {deviceId: prevMicId} : true;
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      micStreamRef.current = micStream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const deviceId = devices.find(d => d.label === micStream.getAudioTracks()[0].label).deviceId;
      micIdRef.current = deviceId;
      const mic = Tone.getContext().createMediaStreamSource(micStream);
      micRef.current = mic;
      Tone.connect(mic, recorderRef.current);
    } catch (e) {
      console.error("Error accessing the microphone:", e)
    }
    if (recordingPermission === "granted") return true;
    closeMic();
    return false;
  }

  const closeMic = () => {
    const micStream = micStreamRef.current;
    const mic = micRef.current;
    if (micStreamRef) micStream.getTracks().forEach(track => track.stop());
    if (mic) mic.disconnect();
    micStreamRef.current = null;
    micRef.current = null;
  }
  
  const startRecording = async () => {
    const recorder = recorderRef.current;
    if (isRecording) return;
    if (!await openMic()) return;
    setIsRecording(true);
    recorder.start();
  }
  
  const bind = useDrag(({ first, last }) => {
    if (first) startRecording();
    if (last) saveRecording();
  }) 
  
  return <div {...bind()} className={`${isRecording? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}/>
}
export default Recorder;
