import { useContext, useEffect, useId, useRef, useState } from "react";
import { getSoundColor } from "@utils/misc";
import LibraryContext from "@context/LibraryContext";

const SoundWaveform = ({ className="", soundName, loaded }) => {
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
      <g strokeLinecap='round' strokeWidth='2' mask={`url(#${maskId})`}>
        {waveformLines}
      </g>
    </svg>
  </div>
}
export default SoundWaveform;
