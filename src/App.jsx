import { useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

function App() {
  const soundClasses = [0,1,2,3,4,5,6].map((soundClass)=> <SoundClass soundClass={soundClass} createSoundInstance={(pos)=>addSoundInstance({soundClass, pos})} /> )

  const [highestZIndex, setHighestZIndex] = useState(1);
  const getHigherZIndex = (zIndex) => {
    const newHighestZIndex = (zIndex >= highestZIndex) ? zIndex : highestZIndex + 1;
    setHighestZIndex(newHighestZIndex);
    return newHighestZIndex;
  }

  const [soundInstancesData, setSoundInstancesData] = useState([]);
  const addSoundInstance = (instanceData) => setSoundInstancesData([...soundInstancesData, instanceData]);

  return (
    <main className="min-h-dvh grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
      <Pot soundInstances={soundInstancesData.map(instanceData=> <SoundInstance soundClass={instanceData.soundClass} pos={instanceData.pos} getHigherZIndex={getHigherZIndex} />)}/>
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
  const borderColor = useRef(borderColorNames[soundClass]);

  return (
    <div ref={divRef} className={`w-16 h-16 border-8 rounded-full ${borderColor.current} cursor-grab touch-none`}
      onPointerDown={(e) => createSoundInstance({x0: getElementCenter(divRef.current).x, y0: getElementCenter(divRef.current).y, mx0: e.clientX, my0: e.clientY})}/>
  )
}

const SoundInstance = ({ soundClass, getHigherZIndex, pos }) => {
  const borderColor = useRef(borderColorNames[soundClass]);
  const [zIndex, setZIndex] = useState(0);

  const [dragging, setDragging] = useState(false)
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0}))
  const bind = useDrag(({ active, first, offset: [x, y] }) => {
    if (first) setZIndex(getHigherZIndex(zIndex));
    setDragging(active);
    api.start({ x, y });
  })

  const divRef = useRef(null);
  useEffect(() => {
    const pointerEvent = new PointerEvent("pointerdown", {buttons: 1, clientX: pos.mx0, clientY: pos.my0, bubbles:true})
    divRef.current.dispatchEvent(pointerEvent);
  }, []);

  const left = pos.x0-48; // 96 px wide
  const top = pos.y0-48; // 96 px tall
  return <animated.div {...bind()} ref={divRef}
    className={`absolute w-24 h-24 border-8 rounded-full ${borderColor.current} ${dragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none`}
    style={{ x, y, zIndex, left, top }} />
}


const getElementCenter = (element) => {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return {x: centerX, y: centerY}
}

export default App
