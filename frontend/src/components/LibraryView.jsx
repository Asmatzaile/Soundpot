import { useContext, useRef } from "react";
import LibrarySound from "./LibrarySound";
import LibraryContext from "@context/LibraryContext";
import { useSettings } from "@context/SettingsContext";
import { animated, useTransition } from "@react-spring/web";

const AnimatedLibrarySound = animated(LibrarySound);

const LibraryView = ({ instanceManager }) => {
  const { settings } = useSettings();
  const { library } = useContext(LibraryContext);

  const addSoundInstance = (data, e) => {
    const creationEvent = instanceManager.creationEvents.LIBRARY;
    Object.assign(creationEvent, e);
    instanceManager.add({...data, creationEvent });
  }

  const initRef = useRef(true);
  const librarySoundsArray = [...library.entries()]
  .filter(([_, info]) => settings.allowExplicit ? true : !info.is_explicit);
  const transitions = useTransition(librarySoundsArray, {
    keys: (item) => item[0],
    from: { opacity: 0, transform: "scale(0.3)" },
    enter: { opacity: 1, transform: "scale(1)" },
    leave: { opacity: 0, transform: "scale(0.3)" },
    immediate: initRef.current,
    config: {
      tension: 300,
    }
  });
  initRef.current = false;
  
  // TODO: https://caniuse.com/mdn-css_properties_interpolate-size
  return (
    <div id="library" className="p-4 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] content-start place-items-center gap-4 overflow-auto flex-auto">
      {transitions((style, [soundName, _]) => <AnimatedLibrarySound style={{...style}} key={soundName} soundName={soundName} addSoundInstance={addSoundInstance}/>) }
    </div>
  )
}
export default LibraryView;
