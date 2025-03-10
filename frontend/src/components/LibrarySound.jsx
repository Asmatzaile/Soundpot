import { useContext, useEffect, useRef, useState } from "react";
import { getElementCenter } from "@utils/dom";
import LibraryContext from "@context/LibraryContext";
import SoundWaveform from "./SoundWaveform";

const LibrarySound = ({ style, soundName, addSoundInstance }) => {
  const { library } = useContext(LibraryContext);
  const divRef = useRef(null);
  const [isGrayscale, setIsGrayscale] = useState(false);

  useEffect(() => {
    if (soundName === undefined) return;
    if (!library.get(soundName)) return; // for some reason being disposed doesn't update so well
    setIsGrayscale(library.get(soundName).flags.has("trash"));
  }, [library, soundName])
  
  const [loaded, setLoaded] = useState(false);
  useEffect(()=> {
    const bufferLoaded = library.get(soundName).buffer.loaded;
    setLoaded(bufferLoaded);
    if (!bufferLoaded) document.addEventListener(`bufferload-${soundName}`, () => setLoaded(true), { once: true })
  }, [])
  
  const handlePointerDown = (e) => {
    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    addSoundInstance({soundName, pos}, e);
  }
  
  return (
    <div ref={divRef} style={style} className={`cursor-grab touch-none select-none`} onPointerDown={handlePointerDown}>
      <SoundWaveform isGrayscale={isGrayscale} soundName={soundName} loaded={loaded} className={"size-16"}/>
    </div>
  )
}
export default LibrarySound;
