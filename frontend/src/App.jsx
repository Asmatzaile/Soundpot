import { useEffect, useRef, useState, createContext, useContext, useId } from 'react';
import { useSpring, useTransition, animated, to } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import * as Tone from "tone";
import { dispatchPointerEvent, getElementCenter, isSelectorInPoint } from './utils/dom';
import { doCirclesCollide, isCircleInCircle, resampleArray } from './utils/math';
import { getSoundColor } from './utils/misc';
import { getLibraryMetadata, getMergedSoundsMetadata, uploadRecording } from './api';

const LibraryContext = createContext({
  library: new Map(),
  addSoundToLibrary: () => {},
  addOnLoadListener: () => {},
});

const DISPLAYBUFFER_SIZE = 32;

function App() {
  const [library, setLibrary] = useState(null);
  const [bufferListeners, setBufferListeners] = useState(new Map());

  const latestLibrary = useRef(library);
  useEffect(() => {
    latestLibrary.current = library;
  }, [library]);

  useEffect(()=> { // init script
    const abortController = new AbortController();
    const signal  = abortController.signal;

    ( async () => {
      const libraryMetadata = await getLibraryMetadata(signal);
      setLibrary(new Map());
      Object.entries(libraryMetadata).forEach(soundMetadata=>addSoundToLibrary(soundMetadata));
    } )();

    const compressor = new Tone.Compressor()
    const reverb = new Tone.Reverb({ wet: 0.5 });
    Tone.getDestination().chain(reverb, compressor);

    return () => abortController.abort();
  }, []);

  const addSoundToLibrary = (soundMetadata) => {
    const [soundName, soundInfo] = soundMetadata;
    const buffer = loadBuffer(soundName);
    setLibrary(prev => {
      prev.set(soundName, {...soundInfo, buffer})
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
    console.info(`Loading sound "${soundName}"...`);
    const buffer = new Tone.ToneAudioBuffer("/api/library/" + soundName);
    addOnLoadListener(buffer, () => console.info(`Sound "${soundName}" loaded!`));
    addOnLoadListener(buffer, () => generateDisplayBuffer(soundName));
    return buffer;
  }

  const generateDisplayBuffer = async (soundName) => {
    const buffer = latestLibrary.current.get(soundName).buffer;
    const channelData = buffer.getChannelData(0);
    const displayBuffer = resampleArray(channelData, DISPLAYBUFFER_SIZE);
    setLibrary(prev => {
      prev.set(soundName, {...prev.get(soundName), displayBuffer})
      return new Map(prev);
    });
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
    const newSoundName = newSoundMetadata[0];
    setSoundInstancesData(prev => {
      if (!prev.has(newInstanceKey)) return prev; // Don't try if it was removed while the sound was being created
      const updatedNewInstance = {...prev.get(newInstanceKey), soundName: newSoundName};
      return new Map(prev.set(newInstanceKey, updatedNewInstance))
    });
    
  }

  return (
    <main className="h-dvh w-dvw grid grid-cols-[4fr_minmax(200px,_1fr)] touch-none">
    <LibraryContext.Provider value={{ library, addSoundToLibrary, addOnLoadListener }}>
      <Pot soundInstancesData={soundInstancesData} setSoundInstancesData={setSoundInstancesData} removeSoundInstance={removeSoundInstance} mergeSoundInstances={mergeSoundInstances} />
      <Sidebar addSoundInstance={addSoundInstance} />
    </LibraryContext.Provider>
    </main>
  )
}

const Sidebar = ({ addSoundInstance }) => {
  return <div className="bg-stone-800 flex flex-col max-h-dvh">
    <LibraryView addSoundInstance={addSoundInstance} />
    <Recorder />
  </div>
}

const Recorder = () => {
  const { addSoundToLibrary } = useContext(LibraryContext);

  const [isRecording, setIsRecording] = useState(false);

  const recorderRef = useRef(null);
  const micRef = useRef(null);
  const micIdRef = useRef(null);
  const micStreamRef = useRef(null);

  useEffect(() => {
    const recorder = new Tone.Recorder();
    recorderRef.current = recorder;
    return () => {
      recorderRef.current.dispose();
    }
  }, [])

  const saveRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    // closeMic(); // if mic is closed, next recording has to open it and cuts the start!
    const recording = await recorderRef.current.stop();
    const newSoundMetadata = await uploadRecording(recording);
    addSoundToLibrary(newSoundMetadata);
  }

  const openMic = async () => {
    if (micRef.current) return true;
    const recordingPermission = (await navigator.permissions.query({ name: 'microphone' })).state;
    const prevMicId = micIdRef.current;
    try {
      const constraints = prevMicId ? {deviceId: prevMicId} : true;
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      micStreamRef.current = micStream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const deviceId = devices.find(d => d.label === micStream.getAudioTracks()[0].label).deviceId;
      micIdRef.current = deviceId;
      const mic = Tone.getContext().createMediaStreamSource(micStream);
      micRef.current = mic;
      Tone.connect(mic, recorderRef.current);
    } catch (e) {
      console.error("Error accessing the microphone:", e)
    }
    if (recordingPermission === "granted") return true;
    closeMic();
    return false;
  }

  const closeMic = () => {
    const micStream = micStreamRef.current;
    const mic = micRef.current;
    if (micStreamRef) micStream.getTracks().forEach(track => track.stop());
    if (mic) mic.disconnect();
    micStreamRef.current = null;
    micRef.current = null;
  }

  const startRecording = async () => {
    const recorder = recorderRef.current;
    if (isRecording) return;
    if (!await openMic()) return;
    setIsRecording(true);
    recorder.start();
  }

  const bind = useDrag(({ first, last }) => {
    if (first) startRecording();
    if (last) saveRecording();
  }) 

  return <div {...bind()} className={`${isRecording? "bg-red-500" : "bg-stone-700"} h-16 touch-none cursor-pointer`}/>
}

const LibraryView = ({ addSoundInstance }) => {
  const { library } = useContext(LibraryContext);
  const LibrarySounds = [...library.entries()].map(([soundName, _]) => <LibrarySound key={soundName} soundName={soundName} addSoundInstance={addSoundInstance} />);

  return (
    <div id="library" className="p-4 grid grid-cols-[repeat(auto-fill,_minmax(64px,_1fr))] content-start place-items-center gap-4 overflow-auto flex-auto">
      {LibrarySounds}
    </div>
  )
}

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

const Water = ({ soundInstancesData, setSoundInstancesData}) => {
  const [ripplesData, setRipplesData] = useState(new Map());
  const [maxRippleSize, setMaxRippleSize] = useState();
  const addRipple = (rippleData) => {
    setRipplesData(prev=> {
      const key = Math.max(...prev.keys(), -1) + 1;
      const newRippleData = new Map(prev);
      newRippleData.set(key, rippleData);
      return newRippleData;
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
    const { width, height } = waterRef.current.getBoundingClientRect();
    setMaxRippleSize(Math.sqrt(width**2 + height**2) * 2);
  }

  const createRandomRipple = () => {
    const { width, height } = waterRef.current.getBoundingClientRect();
    const x = Math.floor(Math.random()*width);
    const y = Math.floor(Math.random()*height);
    addRipple({pos:{x, y}});
  }

  const waterRef = useRef(null);
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
    if (e.target === waterRef.current) addRipple({pos:{x:e.offsetX, y:e.offsetY}})
  }
  useEffect(() => {
    waterRef.current.addEventListener("pointerdown", handlePointerDown);
    return () => waterRef.current?.removeEventListener("pointerdown", handlePointerDown)
  }, [ripplesData])


  const ripples = [...ripplesData.entries()].map(([key, data]) => <Ripple key={key} id={key} {...data} functions={rippleFunctions} />)
  return <div ref={waterRef} id="water" className="overflow-hidden relative size-full">
    <svg xmlns="http://www.w3.org/2000/svg" className="size-full pointer-events-none"
      fill="none" stroke={"rgb(120 113 108)"/* color-stone-500*/} strokeWidth="2px">
      {ripples}
    </svg>
  </div>
}

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
  return <animated.circle cx={pos.x} cy={pos.y} r={size.get()/2} />
}

const LibrarySound = ({ soundName, addSoundInstance }) => {
  const { library, addOnLoadListener } = useContext(LibraryContext);
  const divRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  useEffect(()=> {
    const buffer = library.get(soundName).buffer;
    if (!buffer.loaded) addOnLoadListener(buffer, () => setLoaded(true));
    else setLoaded(true);
  }, [])

  const handlePointerDown = (e) => {
    const pos = {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}
    addSoundInstance({soundName, pos, creationEvent: e});
  }

  return (
    <div ref={divRef} className={`cursor-grab touch-none select-none`} onPointerDown={handlePointerDown}>
      <SoundWaveform soundName={soundName} loaded={loaded} className={"size-16"}/>
    </div>
  )
}

const SoundInstance = ({ id, style, isDisposed, soundName, pos, functions, justCollided, creationEvent }) => {
  const { library, addOnLoadListener } = useContext(LibraryContext);

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

  useEffect(() => {
    if (soundName === undefined) return () => undefined;
    const buffer = library.get(soundName).buffer;
    if (!buffer.loaded) addOnLoadListener(buffer, loadPlayer);
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
    className={`absolute ${dragging ? 'cursor-grabbing' : 'cursor-grab'} touch-none top-0`}
    style={{ ...style, zIndex, transform: to([x, y, style.transform, transform], (x, y, tf1, tf2) => `translate3d(${x}px, ${y}px, 0) ${tf1} ${tf2}`) }} >
      <SoundWaveform soundName={soundName} loaded={loaded} className="size-24 -translate-x-1/2 -translate-y-1/2 absolute"/>
    </animated.div>
}

const AnimatedSoundInstance = animated(SoundInstance);

const SoundWaveform = ({ className="", soundName, loaded }) => {
  const color = useRef(getSoundColor(soundName));
  useEffect(() => {
    color.current = getSoundColor(soundName) ?? 'text-white';
  }, [soundName]);

  const { library } = useContext(LibraryContext);
  useEffect(()=> {
    if (!soundName) return;
    if (!library.get(soundName).displayBuffer) return;
    setWaveformLines(calcWaveformLines(library.get(soundName).displayBuffer));
  }, [library])

  const calcWaveformLines = displayBuffer => displayBuffer.map((value, i) => {
    const transform = `rotate(${i*360/displayBuffer.length})`;
    const maxSize = 12.5;
    const size = Math.max(1, value * maxSize);
    const staggerTime = `${i/displayBuffer.length*0.1}s`
    return <>
      <line key={`${i}-out`} x1="0" x2="0" y1={-25} y2={-25-maxSize} strokeDasharray={maxSize} strokeDashoffset={maxSize-size} transform={transform} style={{ transition: `stroke-dashoffset 0.2s ease-out ${staggerTime}`}}/>
      <line key={`${i}-in`} x1="0" x2="0" y1={-25} y2={-25+maxSize} strokeDasharray={maxSize} strokeDashoffset={maxSize-size} transform={transform} style={{ transition: `stroke-dashoffset 0.2s ease-out ${staggerTime}`}}/>
    </>
  });
  const [waveformLines, setWaveformLines] = useState(calcWaveformLines(Array(DISPLAYBUFFER_SIZE).fill(0)));

  const maskId = useId();
  return <div style={{ transition: "color 0.4s" }}
  className={`${className} ${className.includes('absolute')? '' : 'relative'} ${color.current} border-current border-4 rounded-full
  flex justify-center items-center backdrop-blur-xs`}>
    <svg style={{ scale: "100%", pointerEvents: "none" }} className='stroke-current absolute' viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id={maskId}>
          <rect x="-50" y="-50" width="100" height="100" fill="white" />
          <g style={{animation: `rotation 1s linear infinite ${loaded ? ', fadeout 0.1s linear forwards' : ''}`}}>
            <path d="M 0 -50 L 0 0 L 50 0 A 50 50 0 1 0 0 -50" fill="black"/>
          </g>
        </mask>
      </defs>
      <g strokeLinecap='round' strokeWidth='2' mask={`url(#${maskId})`}>
        {waveformLines}
      </g>
    </svg>
  </div>
}

export default App
