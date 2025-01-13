import { useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

function App() {

  return (
    <div className="flex justify-center items-center min-h-svh">
      <h1 className>Soundpot</h1>
      <Pot />
    </div>
  )
}

const Pot = () => {
  const [highestZIndex, setHighestZIndex] = useState(1);
  const getHigherZIndex = (zIndex) => {
    const newHighestZIndex = (zIndex >= highestZIndex) ? zIndex : highestZIndex + 1;
    setHighestZIndex(newHighestZIndex);
    return newHighestZIndex;
  }

  return(
    <>
      <SoundObject getHigherZIndex={getHigherZIndex} />
      <SoundObject getHigherZIndex={getHigherZIndex} />
      <SoundObject getHigherZIndex={getHigherZIndex} />
    </>
  )
}

const borderColorNames = ['border-red-400', 'border-orange-400', 'border-amber-400', 'border-yellow-400', 'border-lime-400', 'border-green-400', 'border-emerald-400', 'border-teal-400', 'border-cyan-400', 'border-sky-400', 'border-blue-400', 'border-indigo-400', 'border-violet-400', 'border-purple-400', 'border-fuchsia-400', 'border-pink-400', 'border-rose-400'];
const getBorderColor = () => {
 return borderColorNames[Math.floor(Math.random()*borderColorNames.length)];
}

const SoundObject = ({ getHigherZIndex }) => {
  const borderColor = useRef(getBorderColor())
  const [zIndex, setZIndex] = useState(0);
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }))
  const bind = useDrag(({ first, offset: [x, y] }) => {
    api.start({ x, y });
    if (first) setZIndex(getHigherZIndex(zIndex));
  })

  return <animated.div {...bind()}
    className={`absolute w-24 h-24 border-8 rounded-full ${borderColor.current} cursor-pointer touch-none`}
    style={{ x, y, zIndex }} />
}

export default App
