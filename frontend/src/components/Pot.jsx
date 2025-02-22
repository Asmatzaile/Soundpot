import { useState } from "react";
import { useTransition } from "@react-spring/web";
import AnimatedSoundInstance from "./SoundInstance";
import Water from "./Water";
import { doCirclesCollide } from "@utils/math";

const Pot = ({ soundInstancesData, setSoundInstancesData, removeSoundInstance, mergeSoundInstances }) => {
  
  const [highestZIndex, setHighestZIndex] = useState(1);
  const instanceFunctions = {
    removeInstance: (key) => removeSoundInstance(key),
    getHigherZIndex: (zIndex) => {
      const newHighestZIndex = (zIndex >= highestZIndex) ? zIndex : highestZIndex + 1;
      setHighestZIndex(newHighestZIndex);
      return newHighestZIndex;
    },
    updateInstance: (key, newValues) => {
      soundInstancesData.set(key, {...soundInstancesData.get(key), ...newValues})
      setSoundInstancesData(new Map(soundInstancesData));
    },
    checkMerges: (key) => {
      const pos = soundInstancesData.get(key).pos;
      const collidingKey = [...soundInstancesData.keys()].find(candidateKey => {
        if (soundInstancesData.get(candidateKey).isBusy) return false;
        if (key === candidateKey) return false;
        const candidatePos = soundInstancesData.get(candidateKey).pos;
        return doCirclesCollide(pos.x, pos.y, 48, candidatePos.x, candidatePos.y, 48);
      });
      if (collidingKey !== undefined) mergeSoundInstances(key, collidingKey)
      },
  }
  
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
      <Water soundInstancesData={soundInstancesData} setSoundInstancesData={setSoundInstancesData} />
      {transitions((style, [key, instanceData]) => <AnimatedSoundInstance style={{...style}} key={key} id={key}
        functions={instanceFunctions} {...instanceData} isDisposed={!soundInstancesData.has(key)} />
      )}
    </div>
  )
}
export default Pot;
