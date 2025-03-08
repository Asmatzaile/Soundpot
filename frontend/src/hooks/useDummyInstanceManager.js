import { useRef } from "react";

const useDummyInstanceManager = (instanceManager) => {
    const instanceKeyRef = useRef();
    
    const create = (e, pos, creationEvent) => {
        Object.assign(creationEvent, e);
        instanceKeyRef.current = instanceManager.add({ pos, creationEvent });
    }
    
    const updateSoundName = (newSoundName) => {
        const instanceKey = instanceKeyRef.current;
        const instance = instanceManager.instances.get(instanceKey);
        if (instance) { // if it was left inside the pot
            instance.soundName = newSoundName;
            instanceManager.update(instanceKey, instance);
        }
    }
    
    const remove = () => {
        const instanceKey = instanceKeyRef.current;
        if (instanceKey === undefined) return;
        instanceManager.remove(instanceKey);
        forget();
    }
    
    const forget = () => {
        instanceKeyRef.current = undefined;
    }
    
    return {create, updateSoundName, remove, forget}
}
export default useDummyInstanceManager;
