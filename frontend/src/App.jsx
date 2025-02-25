import { useEffect, useState } from 'react';
import * as Tone from "tone";
import { getMergedSoundsMetadata } from './api';
import Pot from '@components/Pot';
import Sidebar from '@components/Sidebar';
import LibraryContext from './LibraryContext';
import useLibrary from '@hooks/useLibrary';

function App() {
  const { library, addSoundToLibrary, DISPLAYBUFFER_SIZE } = useLibrary();

  useEffect(()=> {
    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);
  }, []);

  const [soundInstancesData, setSoundInstancesData] = useState(new Map());
  
  const [lastInstanceKey, setLastInstanceKey] = useState(-1);
  const getNewInstanceKey = () => {
    const newInstanceKey = lastInstanceKey + 1;
    setLastInstanceKey(newInstanceKey);
    return newInstanceKey;
  }

  const loaded = library !== null
  if (!loaded) return <main className="min-h-dvh grid place-content-center" >Loading...</main>

  const addSoundInstance = (instanceData) => {
    const key = getNewInstanceKey();
    setSoundInstancesData(new Map(soundInstancesData.set(key, instanceData)));
    return key;
  }
  const removeSoundInstance = (key) => {
    soundInstancesData.delete(key);
    setSoundInstancesData(new Map(soundInstancesData));
  }
  const mergeSoundInstances = async (key1, key2) => {
    const {soundName: soundName1, pos: pos1} = soundInstancesData.get(key1);
    const {soundName: soundName2, pos: pos2} = soundInstancesData.get(key2);

    removeSoundInstance(key1);
    removeSoundInstance(key2);
    const pos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2};
    const newInstanceKey = addSoundInstance({soundName: undefined, pos});

    const newSoundMetadata = await getMergedSoundsMetadata(soundName1, soundName2);
    if (!newSoundMetadata) return removeSoundInstance(newInstanceKey); // if there was an error, abort

    // First, add the sound to the library, so that the buffer is loaded
    addSoundToLibrary(newSoundMetadata);

    // Then, update instance, that can access the new buffer
    const newSoundName = newSoundMetadata[0];
    setSoundInstancesData(prev => {
      if (!prev.has(newInstanceKey)) return prev; // Don't try if it was removed while the sound was being created
      const updatedNewInstance = {...prev.get(newInstanceKey), soundName: newSoundName};
      return new Map(prev.set(newInstanceKey, updatedNewInstance))
    });
    
  }

  return (
    <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
    <LibraryContext.Provider value={{ library, addSoundToLibrary, DISPLAYBUFFER_SIZE }}>
      <Pot soundInstancesData={soundInstancesData} setSoundInstancesData={setSoundInstancesData} removeSoundInstance={removeSoundInstance} mergeSoundInstances={mergeSoundInstances} />
      <Sidebar addSoundInstance={addSoundInstance} />
    </LibraryContext.Provider>
    </main>
  )
}

export default App
