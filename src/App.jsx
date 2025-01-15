import { useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

function App() {
  const soundClasses = [0,1,2,3,4,5,6].map((soundClass)=> <SoundClass soundClass={soundClass} createSoundInstance={(pos)=>addSoundInstance({soundClass, pos})} /> )


  const [lastInstanceKey, setLastInstanceKey] = useState(-1);
  const getNewInstanceKey = () => {
    const newInstanceKey = lastInstanceKey + 1;
    setLastInstanceKey(newInstanceKey);
    return newInstanceKey;
  }

  const [soundInstancesData, setSoundInstancesData] = useState(new Map());
  const addSoundInstance = (instanceData) => {
    const key = getNewInstanceKey();
    setSoundInstancesData(new Map(soundInstancesData.set(key, instanceData)));
  }
  const removeSoundInstance = (key) => {
    soundInstancesData.delete(key);
    setSoundInstancesData(new Map(soundInstancesData));
  }
  const mergeSoundInstances = (key1, key2) => {
    const {soundClass: soundClass1, pos: pos1} = soundInstancesData.get(key1);
    const {soundClass: soundClass2, pos: pos2} = soundInstancesData.get(key2);
    const soundClass = soundClass1 + soundClass2;
    const pos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2};
    addSoundInstance({soundClass, pos});
    removeSoundInstance(key1);
    removeSoundInstance(key2);
  }

  const [highestZIndex, setHighestZIndex] = useState(1);
  const instanceFunctions = {
    removeInstance: (key) => removeSoundInstance(key),
    getHigherZIndex: (zIndex) => {
      const newHighestZIndex = (zIndex >= highestZIndex) ? zIndex : highestZIndex + 1;
      setHighestZIndex(newHighestZIndex);
      return newHighestZIndex;
    },
    updatePos: (key, [newX, newY]) => {
      soundInstancesData.set(key, {...soundInstancesData.get(key), pos: {x: newX, y: newY}})
      setSoundInstancesData(new Map(soundInstancesData));
    },
    checkMerges: (key) => {
      const pos = soundInstancesData.get(key).pos;
      const collidingKey = [...soundInstancesData.keys()].find(candidateKey => {
        const candidatePos = soundInstancesData.get(candidateKey).pos;
        return key != candidateKey && doCirclesCollide(pos.x, pos.y, 48, candidatePos.x, candidatePos.y, 48);
      });
      if (collidingKey !== undefined) mergeSoundInstances(key, collidingKey)
    }
  }

  const soundInstances = [...soundInstancesData.entries()].map(([key, instanceData]) => <SoundInstance key={key} id={key} functions={instanceFunctions} soundClass={instanceData.soundClass} pos={instanceData.pos} />);
  return (
    <main className="min-h-dvh grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
      <Pot soundInstances={soundInstances}/>
      <Library soundClasses={soundClasses} addSoundInstance={addSoundInstance} />
    </main>
  )
}

const Library = ({ soundClasses }) => {
  return (
    <div id="library" className="bg-stone-800 p-4 grid grid-cols-[repeat(auto-fill,_minmax(64px,_1fr))] content-start place-items-center gap-4">
      {soundClasses}
    </div>
  )
}

const Pot = ({ soundInstances }) => {
  return(
    <div id="pot" className="bg-stone-900">
      {soundInstances}
    </div>
  )
}

const borderColorNames = ['border-red-400', 'border-orange-400', 'border-amber-400', 'border-yellow-400', 'border-lime-400', 'border-green-400', 'border-emerald-400', 'border-teal-400', 'border-cyan-400', 'border-sky-400', 'border-blue-400', 'border-indigo-400', 'border-violet-400', 'border-purple-400', 'border-fuchsia-400', 'border-pink-400', 'border-rose-400'];
const getBorderColor = () => {
 return borderColorNames[Math.floor(Math.random()*borderColorNames.length)];
}

const SoundClass = ( { soundClass, createSoundInstance }) => {
  const divRef = useRef(null);
  const borderColor = useRef(borderColorNames[soundClass%borderColorNames.length]);

  const handlePointerDown = (e) => {
    createSoundInstance({x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y});
    setTimeout(() => createPointerDownEvent(e.clientX, e.clientY), 1); // we simulate a pointerdown event so that the created instance is taken up
  }

  return (
    <div ref={divRef} className={`w-16 h-16 border-8 rounded-full ${borderColor.current} cursor-grab touch-none grid place-content-center text-white select-none`}
      onPointerDown={handlePointerDown}
    >{soundClass}</div>
  )
}

const SoundInstance = ({ id, soundClass, pos, functions }) => {
  const borderColor = useRef(borderColorNames[soundClass%borderColorNames.length]);
  const [zIndex, setZIndex] = useState(0);

  const [dragging, setDragging] = useState(false)
  const onChangeRef = useRef(null);
  const [{ x, y }, api] = useSpring(() => ({ x: pos.x, y: pos.y, onChange: () => onChangeRef?.current()}))

  // needed because Spring memoizes everything
  useEffect(()=> {
    onChangeRef.current = () => {
      functions.updatePos(id, [x.get(), y.get()]);
      if (!dragging) functions.checkMerges(id);
    }
  }, [dragging, functions]) // functions is also a dep cause it relies on current values of soundInstancesData


  const bind = useDrag(({ active, first, last, xy, offset: [x, y] }) => {
    if (first) setZIndex(functions.getHigherZIndex(zIndex));
    if (last) {
      functions.checkMerges(id);
      const elems = document.elementsFromPoint(xy[0], xy[1]); // thanks https://github.com/pmndrs/use-gesture/issues/88#issuecomment-1154734405
      if (elems && !elems.some(elem=>elem.id=="pot")) functions.removeInstance(id);
    }
    setDragging(active);
    api.start({ x, y });
    },
    {from: () => [x.get(), y.get()]}
  )


  return <animated.div {...bind()}
    className={`absolute w-24 h-24 border-8 rounded-full ${borderColor.current} ${dragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none grid place-content-center text-white`}
    style={{ x, y, zIndex, left: "-48px", top: "-48px" }} >{soundClass}</animated.div>
}


const getElementCenter = (element) => {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {x: centerX, y: centerY}
}

const createPointerDownEvent = (mx, my) => {
    const el = document.elementFromPoint(mx, my);
    const pointerEvent = new PointerEvent("pointerdown", {buttons: 1, clientX: mx, clientY: my, bubbles:true})
    el.dispatchEvent(pointerEvent);
}

// https://www.jeffreythompson.org/collision-detection/circle-circle.php
const doCirclesCollide = (c1x, c1y, c1r, c2x, c2y, c2r) => {
  const dx = c2x - c1x;
  const dy = c2y - c1y;
  const d = Math.sqrt(dx*dx + dy*dy);
  return d <= c1r + c2r;
}

export default App
