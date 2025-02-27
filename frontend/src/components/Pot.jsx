import { useEffect, useState } from "react";
import { useTransition } from "@react-spring/web";
import AnimatedSoundInstance from "./SoundInstance";
import Water from "./Water";
import { doCirclesCollide } from "@utils/math";
import { isSelectorInPoint } from "@utils/dom";

const Pot = ({ soundInstancesData, setSoundInstancesData, removeSoundInstance, mergeSoundInstances }) => {
  
  const [highestZIndex, setHighestZIndex] = useState(1);
  const instanceFunctions = key => {
    const getOwnData = () => soundInstancesData.get(key);
    const getHigherZIndex = (zIndex) => {
      const newHighestZIndex = (zIndex >= highestZIndex) ? zIndex : highestZIndex + 1;
      setHighestZIndex(newHighestZIndex);
      return newHighestZIndex;
    }
    const update = newValues => {
      soundInstancesData.set(key, {...getOwnData(), ...newValues})
      setSoundInstancesData(new Map(soundInstancesData));
    }
    const isUnder = otherInstance => isUnder2.bind(getOwnData())(otherInstance)
    return { getHigherZIndex, update, isUnder }
  }

  function isUnder2 (otherInstance) {
    if (this.isBusy) return false;
    if (this === otherInstance) return false;
    return doCirclesCollide(this.pos.x, this.pos.y, 48, otherInstance.pos.x, otherInstance.pos.y, 48);
  }
  
  const getInstancesUnder = (key) => {
    const overInstance = soundInstancesData.get(key);
    const collidingInstanceKeys = [...soundInstancesData.keys()].filter(candidateKey => {
      const candidateInstance = soundInstancesData.get(candidateKey);
      return isUnder2.bind(candidateInstance, overInstance)();
    });
    return collidingInstanceKeys;
  }
  const mergeIfPossible = (key) => {
    const collidingKey = getInstancesUnder(key)[0];
    if (collidingKey !== undefined) mergeSoundInstances(key, collidingKey)
  }

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
      {transitions((style, [key, instanceData]) => <AnimatedSoundInstance style={{...style}} key={key} id={key}
        functions={instanceFunctions(key)} {...instanceData} isDisposed={!soundInstancesData.has(key)} />
      )}
    </div>
  )
}
export default Pot;
