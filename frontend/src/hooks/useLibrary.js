import { useEffect, useRef, useState } from "react";
import { resampleArray } from "@utils/math";
import * as api from "@api/libraryApi";
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
      const libraryMetadata = await api.getLibraryMetadata(controller.signal);
      setLibrary(new Map());
      Object.entries(libraryMetadata).forEach(soundMetadata=>add(soundMetadata));
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

  const add = (soundMetadata) => {
    const [soundName, soundInfo] = soundMetadata;
    const buffer = loadBuffer(soundName);
    setLibrary(prev => {
      const newMap = new Map(prev);
      newMap.set(soundName, {...soundInfo, buffer});
      return newMap;
    });
    return soundName;
  }

  const upload = async (sound, metadata) => {
    const newSoundMetadata = await api.uploadSound(sound, metadata);
    return add(newSoundMetadata);
  }

  const remove = (soundName) => {
    api.removeSound(soundName);
    setLibrary(prev => {
      const newMap = new Map(prev);
      newMap.delete(soundName);
      return newMap;
    })
  }

  const merge = async(soundName1, soundName2) => {
    const newSoundMetadata = await api.getMergedSoundsMetadata(soundName1, soundName2);
    if (!newSoundMetadata) return undefined;
    const newSoundName = add(newSoundMetadata);
    return newSoundName;
  }

  const verboseOutput = false;
  const loadBuffer = (soundName) => {
    if (verboseOutput) console.info(`Loading sound "${soundName}"...`);
    const buffer = new ToneAudioBuffer("/api/library/" + soundName);
    buffer.onload = () => {
      document.dispatchEvent(new Event(`bufferload-${soundName}`));
      if (verboseOutput) console.info(`Sound "${soundName}" loaded!`);
      generateDisplayBuffer(soundName);
    };
    return buffer;
  }

  return { data: library, upload, remove, merge, DISPLAYBUFFER_SIZE }
}
