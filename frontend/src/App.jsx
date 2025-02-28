import { useEffect } from 'react';
import * as Tone from "tone";
import Pot from '@components/Pot';
import Sidebar from '@components/Sidebar';
import LibraryContext from '@context/LibraryContext';
import useLibrary from '@hooks/useLibrary';
import { useSoundInstanceManager } from '@hooks/useSoundInstanceManager';

function App() {
  const library = useLibrary();
  const instanceManager = useSoundInstanceManager(library.merge);

  useEffect(()=> {
    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);
  }, []);
  

  const loaded = library.data !== null
  if (!loaded) return <main className="min-h-dvh grid place-content-center" >Loading...</main>

  const removeSound = soundName => {
    library.remove(soundName);
    instanceManager.removeAllWithSound(soundName);
  }

  return (
    <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
    <LibraryContext.Provider value={{ library: library.data, addSoundToLibrary: library.add, removeSound, DISPLAYBUFFER_SIZE: library.DISPLAYBUFFER_SIZE }}>
      <Pot instanceManager={instanceManager} />
      <Sidebar instanceManager={instanceManager} />
    </LibraryContext.Provider>
    </main>
  )
}

export default App
