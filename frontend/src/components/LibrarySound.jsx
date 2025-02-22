import { useContext, useEffect, useRef, useState } from "react";
import { getElementCenter } from "@utils/dom";
import LibraryContext from "../LibraryContext";
import SoundWaveform from "./SoundWaveform";

const LibrarySound = ({ soundName, addSoundInstance }) => {
  const { library, addOnLoadListener } = useContext(LibraryContext);
  const divRef = useRef(null);
  
  const [loaded, setLoaded] = useState(false);
  useEffect(()=> {
    const buffer = library.get(soundName).buffer;
    if (!buffer.loaded) addOnLoadListener(buffer, () => setLoaded(true));
    else setLoaded(true);
  }, [])
  
  const handlePointerDown = (e) => {
    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    addSoundInstance({soundName, pos, creationEvent: e});
  }
  
  return (
    <div ref={divRef} className={`cursor-grab touch-none select-none`} onPointerDown={handlePointerDown}>
      <SoundWaveform soundName={soundName} loaded={loaded} className={"size-16"}/>
    </div>
  )
}
export default LibrarySound;
