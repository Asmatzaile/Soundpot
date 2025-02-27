import { useContext, useEffect, useRef, useState } from "react";
import { animated, to, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import * as Tone from "tone";
import { dispatchPointerEvent, dispatchDragEvent } from "@utils/dom";
import LibraryContext from "@context/LibraryContext";
import SoundWaveform from "./SoundWaveform";

const SoundInstance = ({ id, style, isDisposed, soundName, pos, functions, creationEvent }) => {
  const { library } = useContext(LibraryContext);

  const playerRef = useRef(null);
  const player = playerRef.current;

  const [loaded, setLoaded] = useState(false)
  const [dragging, setDragging] = useState(false)

  const loadPlayer = (buffer) => {
    playerRef.current = new Tone.Player(buffer).toDestination();
    setLoaded(true);
  }

  useEffect(() => {
    if (isDisposed) return;
    functions.update({isBusy: !loaded || dragging});
  }, [loaded, dragging, isDisposed]);

  useEffect(() => {
    if (soundName === undefined) return () => undefined;
    const buffer = library.get(soundName).buffer;
    if (buffer.loaded) loadPlayer(buffer);
    else document.addEventListener(`bufferload-${soundName}`, () => loadPlayer(buffer), { once: true });
    return () => playerRef.current?.dispose();
  }, [soundName])
  if (isDisposed) playerRef.current?.stop()
  
  const [zIndex, setZIndex] = useState(0);

  const onChangeRef = useRef(null);
  const [{ x, y }, posApi] = useSpring(() => ({ x: pos.x, y: pos.y, onChange: () => onChangeRef?.current()}))

  // needed because Spring memoizes everything
  useEffect(()=> {
    onChangeRef.current = () => {
      if (isDisposed) return;
      functions.update({pos: {x: x.get(), y: y.get()}});
    }
  }, [dragging, functions, isDisposed]) // functions is also a dep cause it relies on current values of soundInstancesData

  const [justCollided, setJustCollided] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("ripplecollision", e => {
      if (e.soundInstanceId === id) setJustCollided(true);
    }, { signal: controller.signal });
    return () => controller.abort();
  })
  const [{ transform }, transformApi] = useSpring(() => ({transform: "scale(1)"}));
  useEffect(()=> {
    transformApi.start({transform: `scale(${justCollided ? '1.3' : '1'})`, immediate: justCollided})
    if (!justCollided) return;
    player?.start();
    setJustCollided(false);
  }, [justCollided])
  
  const divRef = useRef(null);
  useEffect(() => {
    if (!creationEvent) return;
    dispatchPointerEvent(divRef.current, creationEvent)
  }, [])
  const bind = useDrag(({ first, last, xy, offset: [x, y] }) => {
    const [clientX, clientY] = xy;
    if (first) dispatchDragEvent(divRef.current, {type: "dragstart", clientX, clientY});
    else if (last && !isDisposed) dispatchDragEvent(divRef.current, {type: "dragend", clientX, clientY});
    else if (!isDisposed) dispatchDragEvent(divRef.current, {type: "drag", clientX, clientY});

    posApi.start({ x, y });
    },
    {from: () => [x.get(), y.get()]}
  )

  const handleDragStart = () => {
    setZIndex(functions.getHigherZIndex(zIndex));
    setDragging(true)
  }
  const handleDragEnd = () => setDragging(false);

  return <animated.div {...bind()} ref={divRef} data-instance-id={id} data-sound={soundName}
    onDragStart={handleDragStart} onDragEnd={handleDragEnd}
    className={`absolute ${dragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none top-0`}
    style={{ ...style, zIndex, transform: to([x, y, style.transform, transform], (x, y, tf1, tf2) => `translate3d(${x}px, ${y}px, 0) ${tf1} ${tf2}`) }} >
      <SoundWaveform soundName={soundName} loaded={loaded} className="size-24 -translate-x-1/2 -translate-y-1/2 absolute"/>
    </animated.div>
}
const AnimatedSoundInstance = animated(SoundInstance);
export default AnimatedSoundInstance;
