import { useContext, useEffect, useRef } from "react";
import { useTransition } from "@react-spring/web";
import AnimatedSoundInstance from "./SoundInstance";
import Water from "./Water";
import { isSelectorInPoint } from "@utils/dom";
import { SettingsIcon } from "lucide-react";
import { useSettings } from "@context/SettingsContext";
import LibraryContext from "@context/LibraryContext";

const Pot = ({ instanceManager, openSettings }) => {
  const { settings } = useSettings();
  const { instances: soundInstancesData, remove: removeInstance } = instanceManager;

  const { library } = useContext(LibraryContext);
  const onSettingsChange = () => {
    if (settings.allowExplicit) return;
    soundInstancesData.forEach(data => {
      if (!library.get(data.soundName).is_explicit) return;
      removeInstance(data.id); // TODO: this creates a react warning (cannot update a component while rendering another) https://reactjs.org/link/setstate-in-render
    })
  }
  const settingsRef = useRef(settings);
  const checkIfSettingsChanged = () => {
    if (settings !== settingsRef.current) onSettingsChange();
    settingsRef.current = settings;
  }
  checkIfSettingsChanged();

  useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("dragend", e => {
      const { clientX: x, clientY: y, target} = e;
      const instanceId = +target.dataset.instanceId;
      if (!isSelectorInPoint("#pot", {x, y})) instanceManager.remove(instanceId);
      else instanceManager.mergeIfPossible(instanceId);
    }, {signal: controller.signal})
    return () => controller.abort();
  }, [soundInstancesData])
  
  const transitions = useTransition([...soundInstancesData.entries()], {
    keys: (item) => item[0],
    from: { opacity: 0, transform: "scale(0.3)" },
    enter: { opacity: 1, transform: "scale(1)" },
    leave: { opacity: 0, transform: "scale(0.3)" },
    config: {
      tension: 300,
    }
  });

  const willMerge = new Set();
  soundInstancesData.forEach(instance => {
    if (willMerge.has(instance.id)) return;
    if (instance.willMerge === undefined) return;
    willMerge.add(instance.id);
    willMerge.add(instance.willMerge);
  })
  
  return(
    <div id="pot" className="bg-stone-900 relative">
      <Water soundInstancesData={soundInstancesData} />
      {transitions((style, [key, instanceData]) => <AnimatedSoundInstance style={{...style}} key={key}
        object={instanceData} isDisposed={!soundInstancesData.has(key)} isGlowing={willMerge.has(key)}/>
      )}
      <div className="pointer-events-none absolute grid grid-cols-2 grid-rows-2 h-full w-full p-4 inset-0">
        <div className="grid grid-flow-col col-start-2 row-start-2 place-self-end">
          <button className="pointer-events-auto" onClick={openSettings}>
            <SettingsIcon className="text-stone-600"/>
          </button>
        </div>
      </div>
    </div>
  )
}
export default Pot;
