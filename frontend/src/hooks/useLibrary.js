import { useEffect, useRef, useState } from "react";
import { resampleArray } from "@utils/math";
import { getLibraryMetadata } from "../api";
import { ToneAudioBuffer } from "tone";


export default function useLibrary() {
  const [library, setLibrary] = useState(null);

  const latestLibrary = useRef(library);
  useEffect(() => {
    latestLibrary.current = library;
  }, [library]);

  const DISPLAYBUFFER_SIZE = 32;
  useEffect(()=> {
    const controller = new AbortController();
    ( async () => {
      const libraryMetadata = await getLibraryMetadata(controller.signal);
      setLibrary(new Map());
      Object.entries(libraryMetadata).forEach(soundMetadata=>addSoundToLibrary(soundMetadata));
    } )();

    return () => controller.abort();
  }, []);

  const generateDisplayBuffer = async (soundName) => {
    const buffer = latestLibrary.current.get(soundName).buffer;
    const channelData = buffer.getChannelData(0);
    const displayBuffer = resampleArray(channelData, DISPLAYBUFFER_SIZE);
    setLibrary(prev => {
      const newMap = new Map(prev);
      newMap.set(soundName, {...prev.get(soundName), displayBuffer})
      return newMap;
    });
  }

  const addSoundToLibrary = (soundMetadata) => {
    const [soundName, soundInfo] = soundMetadata;
    const buffer = loadBuffer(soundName);
    setLibrary(prev => {
      const newMap = new Map(prev);
      newMap.set(soundName, {...soundInfo, buffer});
      return newMap;
    });
  }

  const removeSoundFromLibrary = (soundName) => {
    setLibrary(prev => {
      const newMap = new Map(prev);
      newMap.delete(soundName);
      return newMap;
    })
  }

  const loadBuffer = (soundName) => {
    console.info(`Loading sound "${soundName}"...`);
    const buffer = new ToneAudioBuffer("/api/library/" + soundName);
    buffer.onload = () => {
      document.dispatchEvent(new Event(`bufferload-${soundName}`));
      console.info(`Sound "${soundName}" loaded!`);
      generateDisplayBuffer(soundName);
    };
    return buffer;
  }
  return { library, addSoundToLibrary, removeSoundFromLibrary, DISPLAYBUFFER_SIZE }
}
