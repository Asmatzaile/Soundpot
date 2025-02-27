import { useEffect } from 'react';
import * as Tone from "tone";
import Pot from '@components/Pot';
import Sidebar from '@components/Sidebar';
import LibraryContext from '@context/LibraryContext';
import useLibrary from '@hooks/useLibrary';
import { useSoundInstanceManager } from '@hooks/useSoundInstanceManager';

function App() {
  const { library, addSoundToLibrary, removeSoundFromLibrary, DISPLAYBUFFER_SIZE } = useLibrary();
  const instanceManager = useSoundInstanceManager(addSoundToLibrary);

  useEffect(()=> {
    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);
  }, []);
  

  const loaded = library !== null
  if (!loaded) return <main className="min-h-dvh grid place-content-center" >Loading...</main>

  const removeSound = soundName => {
    removeSoundFromLibrary(soundName);
    instanceManager.removeAllWithSound(soundName);
  }

  return (
    <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
    <LibraryContext.Provider value={{ library, addSoundToLibrary, removeSound, DISPLAYBUFFER_SIZE }}>
      <Pot soundInstancesData={instanceManager.instances} removeSoundInstance={instanceManager.remove} mergeIfPossible={instanceManager.mergeIfPossible} />
      <Sidebar addSoundInstance={instanceManager.add} />
    </LibraryContext.Provider>
    </main>
  )
}

export default App
