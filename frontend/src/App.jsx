import { useEffect, useState } from 'react';
import * as Tone from "tone";
import Pot from '@components/Pot';
import Sidebar from '@components/Sidebar';
import LibraryContext from '@context/LibraryContext';
import useLibrary from '@hooks/useLibrary';
import { useSoundInstanceManager } from '@hooks/useSoundInstanceManager';
import { SettingsModal } from '@components/SettingsModal';
import { SettingsProvider } from '@context/SettingsContext';

function App() {
  const library = useLibrary();
  const instanceManager = useSoundInstanceManager(library.merge);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <SettingsProvider>
      <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(270px,1fr)] touch-none">
        <LibraryContext.Provider value={{ library: library.data, addSoundToLibrary: library.upload, removeSound, DISPLAYBUFFER_SIZE: library.DISPLAYBUFFER_SIZE }}>
          <Pot instanceManager={instanceManager} openSettings={() =>setIsSettingsOpen(true)}/>
          <Sidebar instanceManager={instanceManager} />
        </LibraryContext.Provider>
        { isSettingsOpen && <SettingsModal close={()=> setIsSettingsOpen(false)}/> }
      </main>
    </SettingsProvider>
  )
}

export default App
