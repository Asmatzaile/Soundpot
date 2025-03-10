import { useContext, useEffect, useId, useRef, useState } from "react";
import { getSoundColor } from "@utils/misc";
import LibraryContext from "@context/LibraryContext";

const SoundWaveform = ({ className="", style={}, soundName, loaded, start, isGlowing }) => {
  const divRef = useRef();
  const color = useRef(getSoundColor(soundName));
  useEffect(() => {
    color.current = getSoundColor(soundName) ?? 'text-stone-50';
  }, [soundName]);
  
  const { library, DISPLAYBUFFER_SIZE } = useContext(LibraryContext);
  useEffect(()=> {
    if (!soundName) return;
    if (!library.get(soundName)) return;
    if (!library.get(soundName).displayBuffer) return;
    setWaveformLines(calcWaveformLines(library.get(soundName).displayBuffer));
  }, [library])
  
  const calcWaveformLines = displayBuffer => displayBuffer.map((value, i) => {
    const transform = `rotate(${i*360/displayBuffer.length}deg) translate(0, -25%) scale(var(--scale, 1)) translate(0, 25%)`;
    const maxSize = 12.5;
    const size = Math.max(1, value * maxSize);
    const staggerTime = `${i/displayBuffer.length*0.1}s`
    return <g strokeDasharray={maxSize} strokeDashoffset={maxSize-size} style={{ "--t-time": "0.3s", transition: `stroke-dashoffset 0.2s ease-out ${staggerTime}`}}>
      <line key={`${i}-out`} x1="0" x2="0" y1={-25} y2={-25-maxSize} style={{transform, transition: "transform var(--t-time) linear"}}/>
      <line key={`${i}-in`} x1="0" x2="0" y1={-25} y2={-25+maxSize} style={{transform, transition: "transform var(--t-time) linear"}}/>
    </g>
  });
  const [waveformLines, setWaveformLines] = useState(calcWaveformLines(Array(DISPLAYBUFFER_SIZE).fill(0)));
  
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const currentIntervalId = useRef();
  const soundDuration = useRef();
  useEffect(() => {
    if (!start) return () => clearInterval(currentIntervalId.current);
    setHighlightedLine(0);
    soundDuration.current = library.get(soundName).buffer.duration;
    currentIntervalId.current = setInterval(()=> setHighlightedLine(prev => {
      if (prev+1 < DISPLAYBUFFER_SIZE) return prev + 1;
      clearInterval(currentIntervalId.current);
      return -1;
      }), soundDuration.current * 1000 / DISPLAYBUFFER_SIZE);
  }, [start]);

  useEffect(() => {
    if (highlightedLine === -1) return;
    const element = divRef.current?.querySelector(`.waveformlines > :nth-child(${highlightedLine+1})`);
    if (!element) return;
    const lineDuration = soundDuration.current / DISPLAYBUFFER_SIZE;
    element.style.setProperty("--scale", "1.6");
    element.style.setProperty("--t-time", Math.min(lineDuration/10, 0.1) + "s")
    return () => {
      if (!element) return;
      element.style.setProperty("--t-time", lineDuration * 10 +"s")
      element.style.setProperty("--scale", "1");
    }
  }, [highlightedLine]);

  const maskId = useId();
  return <div ref={divRef} style={{ ...style, transition: "color 0.4s, filter 0.2s", filter: `drop-shadow(0 0 ${isGlowing ? 5 : 0}px)` }}
  className={`${className} ${className.includes('absolute')? '' : 'relative'} ${color.current} border-4 rounded-full
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
      <g className="waveformlines" strokeLinecap='round' strokeWidth='2' mask={`url(#${maskId})`}>
        {waveformLines}
      </g>
    </svg>
  </div>
}
export default SoundWaveform;
