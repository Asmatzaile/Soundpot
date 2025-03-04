import { useEffect } from "react";
import { useTransition } from "@react-spring/web";
import AnimatedSoundInstance from "./SoundInstance";
import Water from "./Water";
import { isSelectorInPoint } from "@utils/dom";
import { Settings } from "lucide-react";

const Pot = ({ instanceManager, openSettings }) => {
  const { instances: soundInstancesData } = instanceManager;

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
  
  return(
    <div id="pot" className="bg-stone-900 relative">
      <Water soundInstancesData={soundInstancesData} />
      {transitions((style, [key, instanceData]) => <AnimatedSoundInstance style={{...style}} key={key}
        object={instanceData} isDisposed={!soundInstancesData.has(key)} />
      )}
      <div className="pointer-events-none absolute grid grid-cols-2 grid-rows-2 h-full w-full p-4 inset-0">
        <div className="grid grid-flow-col col-start-2 row-start-2 place-self-end">
          <button className="pointer-events-auto" onClick={openSettings}>
            <Settings className="text-stone-600"/>
          </button>
        </div>
      </div>
    </div>
  )
}
export default Pot;
