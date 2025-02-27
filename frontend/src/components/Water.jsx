import { useEffect, useRef, useState } from "react";
import Ripple from "./Ripple";
import { doCirclesCollide, isCircleInCircle } from "@utils/math";

class RippleCollision extends Event {
  constructor(rippleId, soundInstanceId) {
    super("ripplecollision");
    this.rippleId = rippleId;
    this.soundInstanceId = soundInstanceId;
  }
}

const Water = ({ soundInstancesData }) => {
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
      checkRippleCollisions(key, newRippleData);
      setRipplesData(new Map(ripplesData));
    },
    getMaxSize: () => maxRippleSize,
  }
  
  const checkRippleCollisions = (rippleKey, rippleData) => {
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
      const collisionEvent = new RippleCollision(rippleKey, instanceKey);
      document.dispatchEvent(collisionEvent);
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
export default Water;
