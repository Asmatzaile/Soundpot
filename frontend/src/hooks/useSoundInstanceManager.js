import { useRef, useState } from "react";
import { doCirclesCollide } from "@utils/math";

const makeInstance = (key, soundName, pos, creationEvent, getHigherZ, update, getInstances) => ({
    id: key,
    soundName,
    pos,
    creationEvent,
    zIndex: 0,
    isBusy: false,
    update,
    bringToFront: function () {
        this.zIndex = getHigherZ(this.zIndex);
        this.update(this);
    },
    isUnder: function (other) {
        if (this.isBusy || other === this) return false;
        return doCirclesCollide(this.pos.x, this.pos.y, 48, other.pos.x, other.pos.y, 48);
    },
    getCollidingKeys: function () {
        return [...getInstances().entries()]
            .filter(([_k, inst]) => inst.isUnder(this))
            .map(([key]) => key);
    }
})


export function useSoundInstanceManager(mergeSounds) {
    const [instances, setInstances] = useState(new Map());

    const [lastInstanceId, setLastInstanceId] = useState(-1);
    const newId = () => {
        const newInstanceId = lastInstanceId + 1;
        setLastInstanceId(newInstanceId);
        return newInstanceId;
    }

    const highestZ = useRef(1);
    const getHigherZ = z => {
        let highest = highestZ.current;
        highest = z >= highest ? z : highest + 1;
        highestZ.current = highest;
        return highest;
    }
    
    const get = (key) => key ? instances.get(key) : instances;

    const add = ({ soundName = undefined, pos, creationEvent = undefined }) => {
        const key = newId();
        const updateObject = updatedObject => update(key, updatedObject);
        const instance = makeInstance(key, soundName, pos, creationEvent, getHigherZ, updateObject, get);
        setInstances(prev => {
            const newMap = new Map(prev);
            newMap.set(key, instance);
            return newMap;
        });
        return key;
    }

    const update = (key, updated) => {
        setInstances(prev => {
            const newMap = new Map(prev);
            newMap.set(key, updated);
            return newMap;
        })
    }

    const remove = (key) => {
        setInstances(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
        })
    }

    const removeAllWithSound = (soundName) => {
        instances.forEach((instance, key) => {
            if (instance.soundName === soundName) remove(key);
        })
    }

    const mergeInstances = async (key1, key2) => {
        const { soundName: soundName1, pos: pos1 } = instances.get(key1);
        const { soundName: soundName2, pos: pos2 } = instances.get(key2);

        remove(key1);
        remove(key2);
        const pos = { x: (pos1.x + pos2.x) / 2, y: (pos1.y + pos2.y) / 2 };
        const newInstanceKey = add({ pos });

        const newSoundName = await mergeSounds(soundName1, soundName2);
        if (newSoundName === undefined) return remove(newInstanceKey); // if there was an error, abort

        setInstances(prev => {
            if (!prev.has(newInstanceKey)) return prev; // Don't try if it was removed while the sound was being created
            const updatedNewInstance = { ...prev.get(newInstanceKey), soundName: newSoundName };
            return new Map(prev.set(newInstanceKey, updatedNewInstance))
        });
    }

    const mergeIfPossible = (key) => {
        const collidingKey = instances.get(key).getCollidingKeys()[0];
        if (collidingKey !== undefined) mergeInstances(key, collidingKey)
    }

    return { instances, update, add, remove, removeAllWithSound, mergeIfPossible }
}
