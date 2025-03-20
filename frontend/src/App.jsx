import { useEffect, useState } from 'react';
import * as Tone from "tone";
import Pot from '@components/Pot';
import Sidebar from '@components/Sidebar';
import LibraryContext from '@context/LibraryContext';
import useLibrary from '@hooks/useLibrary';
import { useSoundInstanceManager } from '@hooks/useSoundInstanceManager';
import { SettingsModal } from '@components/SettingsModal';
import { SettingsProvider } from '@context/SettingsContext';
import { CreditsModal } from '@components/CreditsModal';

function App() {
  const library = useLibrary();
  const instanceManager = useSoundInstanceManager(library.merge);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [started, setStarted] = useState(false)

  useEffect(()=> {
    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);
  }, []);
  

  const loaded = library.data !== null
  if (!started) return <div className="min-h-dvh grid grid-rows-[1fr_auto] bg-stone-900 text-stone-50">
    <main className=" grid place-content-center place-items-center gap-16" >
      <h1 className="text-9xl">Soundpot</h1>
      <button className={`text-2xl uppercase px-4 border-1 rounded-lg transition-colors enabled:hover:bg-stone-50 enabled:hover:border-stone-50 enabled:hover:text-stone-900 disabled:text-stone-200`} disabled={!loaded} onClick={() => setStarted(true)}>
        {!loaded ? "Loading..." : "Start"}
      </button>
    </main>
    <footer className="py-4  grid place-items-center text-stone-200">
      <span>by <a href="https://gorkaegino.com">Gorka Egino</a></span>
    </footer>
  </div>

  const removeSound = soundName => {
    library.remove(soundName);
    instanceManager.removeAllWithSound(soundName);
  }

  return (
    <SettingsProvider>
      <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(270px,1fr)] touch-none overflow-clip">
        <LibraryContext.Provider value={{ library: library.data, addSoundToLibrary: library.upload, removeSound, DISPLAYBUFFER_SIZE: library.DISPLAYBUFFER_SIZE, flagSound: library.flag, unflagSound: library.unflag, containsFreesoundSounds: library.containsFreesoundSounds, downloadAttribution: library.downloadAttribution }}>
          <Pot instanceManager={instanceManager} openSettings={() =>setIsSettingsOpen(true)} openCredits={() => setIsCreditsOpen(true)}/>
          <Sidebar instanceManager={instanceManager} />
          { isSettingsOpen && <SettingsModal close={()=> setIsSettingsOpen(false)}/> }
          { isCreditsOpen && <CreditsModal close={()=> setIsCreditsOpen(false)}/>}
        </LibraryContext.Provider>
      </main>
    </SettingsProvider>
  )
}

export default App
