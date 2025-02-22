import { useEffect, useRef } from "react";
import { animated, useSpring } from "@react-spring/web";

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
export default Ripple;
