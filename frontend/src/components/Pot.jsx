import { useEffect } from "react";
import { useTransition } from "@react-spring/web";
import AnimatedSoundInstance from "./SoundInstance";
import Water from "./Water";
import { isSelectorInPoint } from "@utils/dom";

const Pot = ({ soundInstancesData, removeSoundInstance, mergeIfPossible }) => {  

  useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("dragend", e => {
      const { clientX: x, clientY: y, target} = e;
      const instanceId = +target.dataset.instanceId;
      if (!isSelectorInPoint("#pot", {x, y})) removeSoundInstance(instanceId);
      else mergeIfPossible(instanceId);
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
    <div id="pot" className="bg-stone-900">
      <Water soundInstancesData={soundInstancesData} />
      {transitions((style, [key, instanceData]) => <AnimatedSoundInstance style={{...style}} key={key}
        object={instanceData} isDisposed={!soundInstancesData.has(key)} />
      )}
    </div>
  )
}
export default Pot;
