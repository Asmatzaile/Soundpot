import { useEffect, useRef, useState } from 'react';
import { useSpring, animated, useTransition } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import * as Tone from "tone";
import { dispatchPointerEvent, getElementCenter, isSelectorInPoint } from './utils/dom';
import { doCirclesCollide, isCircleInCircle } from './utils/math';
import { getBorderColor } from './utils/misc';
import { getLibraryMetadata, getMergedSoundsMetadata, uploadRecording } from './api';

const soundBuffers = new Map();

function App() {
  const [library, setLibrary] = useState(null);
  const [bufferListeners, setBufferListeners] = useState(new Map());

  useEffect(()=> { // init script
    ( async () => Object.entries(await getLibraryMetadata()).forEach(([soundName, soundInfo])=> {
      const soundMetadata = {}
      soundMetadata[soundName] = soundInfo;
      addSoundToLibrary(soundMetadata);
    }) )();
    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);
  }, []);

  const addSoundToLibrary = (soundMetadata) => {
    const [soundName, soundInfo] = Object.entries(soundMetadata)[0];
    loadBuffer(soundName);
    setLibrary(prev => {
      prev ??= new Map();
      prev.set(soundName, soundInfo)
      return new Map(prev);
    });
  }

  const addOnLoadListener = (buffer, listener) => {
    setBufferListeners(prev => {
      const listeners = prev.get(buffer) ?? [];
      listeners.push(listener);
      buffer.onload = () => {
        listeners.forEach(fn => fn(buffer));
        setBufferListeners(prev => {
          prev.delete(buffer);
          return new Map(prev);
        })
      }
      prev.set(buffer, listeners);
      return new Map(prev);
    })
  }

  const loadBuffer = (soundName) => {
    if (soundBuffers.has(soundName)) return;
    console.info(`Loading sound "${soundName}"...`);
    const buffer = new Tone.ToneAudioBuffer("/api/library/" + soundName);
    addOnLoadListener(buffer, () => console.info(`Sound "${soundName}" loaded!`));
    soundBuffers.set(soundName, buffer);
  }

  const [soundInstancesData, setSoundInstancesData] = useState(new Map());
  
  const [lastInstanceKey, setLastInstanceKey] = useState(-1);
  const getNewInstanceKey = () => {
    const newInstanceKey = lastInstanceKey + 1;
    setLastInstanceKey(newInstanceKey);
    return newInstanceKey;
  }

  const loaded = library !== null
  if (!loaded) return <main className="min-h-dvh grid place-content-center" >Loading...</main>

  const addSoundInstance = (instanceData) => {
    const key = getNewInstanceKey();
    setSoundInstancesData(new Map(soundInstancesData.set(key, instanceData)));
    return key;
  }
  const removeSoundInstance = (key) => {
    soundInstancesData.delete(key);
    setSoundInstancesData(new Map(soundInstancesData));
  }
  const mergeSoundInstances = async (key1, key2) => {
    const {soundName: soundName1, pos: pos1} = soundInstancesData.get(key1);
    const {soundName: soundName2, pos: pos2} = soundInstancesData.get(key2);

    removeSoundInstance(key1);
    removeSoundInstance(key2);
    const pos = {x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2};
    const newInstanceKey = addSoundInstance({soundName: undefined, pos});

    const newSoundMetadata = await getMergedSoundsMetadata(soundName1, soundName2);
    if (!newSoundMetadata) return removeSoundInstance(newInstanceKey); // if there was an error, abort

    // First, add the sound to the library, so that the buffer is loaded
    addSoundToLibrary(newSoundMetadata);

    // Then, update instance, that can access the new buffer
    const newSoundName = Object.keys(newSoundMetadata)[0];
    setSoundInstancesData(prev => {
      if (!prev.has(newInstanceKey)) return prev; // Don't try if it was removed while the sound was being created
      const updatedNewInstance = {...prev.get(newInstanceKey), soundName: newSoundName};
      return new Map(prev.set(newInstanceKey, updatedNewInstance))
    });
    
  }

  return (
    <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
      <Pot soundInstancesData={soundInstancesData} setSoundInstancesData={setSoundInstancesData} removeSoundInstance={removeSoundInstance} mergeSoundInstances={mergeSoundInstances} addOnLoadListener={addOnLoadListener} />
      <Sidebar library={library} addSoundToLibrary={addSoundToLibrary} addSoundInstance={addSoundInstance} />
    </main>
  )
}

const Sidebar = ({ library, addSoundToLibrary, addSoundInstance }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView library={library} addSoundInstance={addSoundInstance} />
    <Recorder addSoundToLibrary={addSoundToLibrary} />
  </div>
}

const Recorder = ({ addSoundToLibrary }) => {
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef(null);
  const recorder = recorderRef.current;
  const micRef = useRef(null);
  const mic = micRef.current;
  useEffect(() => {
    const mic = new Tone.UserMedia();
    const recorder = new Tone.Recorder();
    mic.connect(recorder);
    mic.open();
    micRef.current = mic;
    recorderRef.current = recorder;
    return () => {
      mic.disconnect();
      recorder.dispose();
    }
  }, [])

  const saveRecording = async () => {
    setRecording(false);
    const recording = await recorder.stop();
    const newSoundMetadata = await uploadRecording(recording);
    addSoundToLibrary(newSoundMetadata);
  }

  const startRecording = async () => {
    mic.open().then(() => {
      setRecording(true);
      recorder.start();
    }).catch(e => console.warn("User doesn't have mic or didn't allow access"));
  }

  const bind = useDrag(({ first, last }) => {
    if (first) startRecording();
    if (last) saveRecording();
  }) 

  return <div {...bind()} className={`${recording? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}/>
}

const LibraryView = ({ library, addSoundInstance }) => {
  const LibrarySounds = [...library.entries()].map(([soundName, _]) => <LibrarySound key={soundName} soundName={soundName} addSoundInstance={addSoundInstance} />);

  return (
    <div id="library" className="p-4 grid grid-cols-[repeat(auto-fill,_minmax(64px,_1fr))] content-start place-items-center gap-4 overflow-auto flex-auto">
      {LibrarySounds}
    </div>
  )
}

const Pot = ({ soundInstancesData, setSoundInstancesData, removeSoundInstance, mergeSoundInstances, addOnLoadListener }) => {

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
    addOnLoadListener: addOnLoadListener,
  }

  const [ripplesData, setRipplesData] = useState(new Map());
  const [maxRippleSize, setMaxRippleSize] = useState();
  const addRipple = (rippleData) => {
    setRipplesData(prev=> {
      const key = Math.max(...prev.keys(), -1) + 1;
      return new Map(prev.set(key, rippleData));
    });
  }
  const removeRipple = (key) => {
    ripplesData.delete(key);
    setRipplesData(new Map(ripplesData));
  }

  const rippleFunctions = {
    remove: (key) => removeRipple(key),
    updateSize: (key, newSize) => {
      const newRippleData = {...ripplesData.get(key), size: newSize}
      ripplesData.set(key, newRippleData);
      checkRippleCollisions(newRippleData);
      setRipplesData(new Map(ripplesData));
    },
    getMaxSize: () => maxRippleSize,
  }

  const checkRippleCollisions = (rippleData) => {
    rippleData.collidedWith ??= new Set(); // make sure the previous collision array exists

    [...soundInstancesData.entries()].forEach(([instanceKey, instanceData])=> {
      const {pos: ripplePos, size: rippleSize} = rippleData;
      if (instanceData.isBusy) {
        rippleData.collidedWith.delete(instanceKey); // that way it can collide again if put up + down 
        return; // don't collide with busy instances (dragging / loading)
      }
      if (rippleData.collidedWith.has(instanceKey)) return; // only care about new collisions
      if (!doCirclesCollide(ripplePos.x, ripplePos.y, rippleSize/2, instanceData.pos.x, instanceData.pos.y, 48)) return;
      if (rippleSize/2 > 48 && isCircleInCircle(ripplePos.x, ripplePos.y, rippleSize/2, instanceData.pos.x, instanceData.pos.y, 48)) return; // don't account for when perimeters aren't touching
      const newInstanceData = {...soundInstancesData.get(instanceKey), justCollided: true};
      setSoundInstancesData(new Map(soundInstancesData.set(instanceKey, newInstanceData)));
      rippleData.collidedWith.add(instanceKey)
    });
  }

  const calcMaxRippleSize = () => {
    const { width, height } = potRef.current.getBoundingClientRect();
    setMaxRippleSize(Math.sqrt(width**2 + height**2) * 2);
  }

  const createRandomRipple = () => {
    const { width, height } = potRef.current.getBoundingClientRect();
    const x = Math.floor(Math.random()*width);
    const y = Math.floor(Math.random()*height);
    addRipple({pos:{x, y}});
  }

  const potRef = useRef(null);
  const intervalRef = useRef(null);
  useEffect(()=> {
    calcMaxRippleSize();
    intervalRef.current = setInterval(createRandomRipple, 5000);
    window.addEventListener("resize", calcMaxRippleSize);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener("resize", calcMaxRippleSize);
    }
  }, []);

  const handlePointerDown = (e) => {
    if (e.target === potRef.current) addRipple({pos:{x:e.offsetX, y:e.offsetY}})
  }
  useEffect(() => {
    potRef.current.addEventListener("pointerdown", handlePointerDown);
    return () => potRef.current.removeEventListener("pointerdown", handlePointerDown)
  }, [ripplesData])

  const transitions = useTransition([...soundInstancesData.entries()], {
    keys: (item) => item[0],
    from: { opacity: 0, transform: "scale(0.3)" },
    enter: { opacity: 1, transform: "scale(1)" },
    leave: { opacity: 0, transform: "scale(0.3)" },
    config: {
      tension: 300,
    }
  });

  const ripples = [...ripplesData.entries()].map(([key, data]) => <Ripple key={key} id={key} {...data} functions={rippleFunctions} />)
  return(
    <div id="pot" ref={potRef} className="bg-stone-900">
      <div id="ripple-container" className="overflow-hidden relative size-full pointer-events-none">
          {ripples}
      </div>
      {transitions((style, [key, instanceData]) =>
      {
        return(
        <animated.div style={{...style, x: instanceData.pos.x, y: instanceData.pos.y}} key={key} className="absolute top-0 left-0">
          <SoundInstance key={key} id={key} functions={instanceFunctions} {...instanceData} isDisposed={!soundInstancesData.has(key)}/>
        </animated.div>
      )})}
    </div>
  )
}

// it would probably be more performant to draw them on a canvas
const Ripple = ({pos, id, functions}) => {
  const onSpringEventRef = useRef(null);

  const [{size}, api] = useSpring(
    () => ({
      from: { size: 10 },
      to: { size: functions.getMaxSize() },
      config: {
        duration: 3000,
      },
      onRest: () => onSpringEventRef?.current.onRest(),
      onChange: () => onSpringEventRef?.current.onChange(),
    }),
  )
  // needed because Spring memoizes everything
  useEffect(()=> {
    onSpringEventRef.current = {
      onRest: () => functions.remove(id),
      onChange: () => functions.updateSize(id, size.get())
    }
  }, [functions]);

  useEffect(()=>{api.start()});
  return <animated.div className="border-stone-500 border-2 rounded-full absolute pointer-events-none"
  style={{transform: "translate(-50%, -50%)", left:pos.x, top:pos.y, width:size, height:size, color:"white"}}
  ></animated.div>
}

const LibrarySound = ({ soundName, addSoundInstance }) => {
  const divRef = useRef(null);
  const borderColor = useRef(getBorderColor(soundName));

  const handlePointerDown = (e) => {
    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    addSoundInstance({soundName, pos, creationEvent: e});
  }

  return (
    <div ref={divRef} className={`w-16 h-16 border-8 rounded-full ${borderColor.current} cursor-grab touch-none grid place-content-center text-white select-none`}
      onPointerDown={handlePointerDown}
    >{soundName}</div>
  )
}

const SoundInstance = ({ id, isDisposed, soundName, pos, functions, justCollided, creationEvent }) => {
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
    functions.updateInstance(id, {isBusy: !loaded || dragging});
  }, [loaded, dragging, isDisposed]);

  const borderColor = useRef(getBorderColor(soundName));
  useEffect(() => {
    borderColor.current = getBorderColor(soundName);

    if (soundName === undefined) return () => undefined;
    const buffer = soundBuffers.get(soundName);
    if (!buffer.loaded) functions.addOnLoadListener(buffer, loadPlayer);
    else loadPlayer(buffer);
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
      functions.updateInstance(id, {pos: {x: x.get(), y: y.get()}});
      if (!dragging) functions.checkMerges(id);
    }
  }, [dragging, functions, isDisposed]) // functions is also a dep cause it relies on current values of soundInstancesData

  const [{ transform }, transformApi] = useSpring(() => ({transform: "scale(1)"}));
  useEffect(()=> {
    transformApi.start({transform: `scale(${justCollided ? '1.3' : '1'})`, immediate: justCollided})
    if (!justCollided) return;
    player?.start();
    functions.updateInstance(id, {justCollided: false})
  }, [justCollided])


  const bind = useDrag(({ active, first, last, xy, offset: [x, y] }) => {
    if (first) setZIndex(functions.getHigherZIndex(zIndex));
    if (last && !isDisposed) {
      functions.checkMerges(id);
      if (!isSelectorInPoint("#pot", {x: xy[0], y: xy[1]})) functions.removeInstance(id);
    }
    setDragging(active);
    posApi.start({ x, y });
    },
    {from: () => [x.get(), y.get()]}
  )

  const divRef = useRef(null);
  useEffect(() => {
    if (!creationEvent) return;
    dispatchPointerEvent(divRef.current, creationEvent)
  }, [])

  return <animated.div {...bind()} ref={divRef}
    className={`absolute w-24 h-24 border-8 rounded-full ${borderColor.current} ${dragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none flex justify-center items-center text-white`}
    style={{ zIndex, left: "-48px", top: "-48px", transform }} > {soundName}
    {loaded || <div className="loader" />}
    </animated.div>
}

export default App
