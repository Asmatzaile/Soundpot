import { useContext } from "react";
import LibrarySound from "./LibrarySound";
import LibraryContext from "@context/LibraryContext";

const LibraryView = ({ instanceManager }) => {
  const { library } = useContext(LibraryContext);

  const addSoundInstance = (data, e) => {
    const creationEvent = instanceManager.creationEvents.LIBRARY;
    Object.assign(creationEvent, e);
    instanceManager.add({...data, creationEvent });
  }
  const LibrarySounds = [...library.entries()].map(([soundName, _]) => <LibrarySound key={soundName} soundName={soundName} addSoundInstance={addSoundInstance} />);
  
  return (
    <div id="library" className="p-4 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] content-start place-items-center gap-4 overflow-auto flex-auto">
      {LibrarySounds}
    </div>
  )
}
export default LibraryView;
