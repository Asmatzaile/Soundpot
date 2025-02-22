import { useContext } from "react";
import LibrarySound from "./LibrarySound";
import LibraryContext from "../LibraryContext";

const LibraryView = ({ addSoundInstance }) => {
  const { library } = useContext(LibraryContext);
  const LibrarySounds = [...library.entries()].map(([soundName, _]) => <LibrarySound key={soundName} soundName={soundName} addSoundInstance={addSoundInstance} />);
  
  return (
    <div id="library" className="p-4 grid grid-cols-[repeat(auto-fill,_minmax(64px,_1fr))] content-start place-items-center gap-4 overflow-auto flex-auto">
      {LibrarySounds}
    </div>
  )
}
export default LibraryView;
