import { useRef, useState } from "react";
import { doCirclesCollide } from "@utils/math";

const creationEvents = {
    get LIBRARY() { return { origin: "library" } },
    get MERGE() { return { origin: "merge" } },
    get RECORDER() { return { origin: "recorder" } },
    get FREESOUND() { return { origin: "freesound" } },
}

const makeInstance = (key, soundName, pos, creationEvent, getHigherZ, update, getInstances) => ({
    id: key,
    soundName,
    pos,
    creationEvent,
    zIndex: 0,
    isLoading: true,
    isDragging: false,
    update,
    bringToFront: function () {
        this.zIndex = getHigherZ(this.zIndex);
        this.update(this);
    },
    isOver: function (other) {
        if (this.isLoading || other.isLoading || other.isDragging || other === this) return false;
        return doCirclesCollide(this.pos.x, this.pos.y, 48, other.pos.x, other.pos.y, 48);
    },
    getCollidingKeys: function () {
        return [...getInstances().entries()]
        .filter(([_k, inst]) => this.isOver(inst))
        .map(([key]) => key);
    }
})


export function useSoundInstanceManager(mergeSounds) {
    const [instances, setInstances] = useState(new Map());
    const instancesRef = useRef(instances);
    instancesRef.current = instances;

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

    const get = (key) => key ? instancesRef.current.get(key) : instancesRef.current;

    const add = ({ soundName, pos, creationEvent }) => {
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
            if (updated.isDragging) updated.willMerge = getFirstCollidingInstanceKeyOf(key); // TODO: also should check if just loaded
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
        const newInstanceKey = add({ pos, creationEvent: creationEvents.MERGE });

        const newSoundName = await mergeSounds(soundName1, soundName2);
        if (newSoundName === undefined) return remove(newInstanceKey); // if there was an error, abort

        setInstances(prev => {
            if (!prev.has(newInstanceKey)) return prev; // Don't try if it was removed while the sound was being created
            const updatedNewInstance = { ...prev.get(newInstanceKey), soundName: newSoundName };
            return new Map(prev.set(newInstanceKey, updatedNewInstance))
        });
    }

    const getFirstCollidingInstanceKeyOf = key => instancesRef.current.get(key)?.getCollidingKeys()[0];

    const mergeIfPossible = (key) => {
        const collidingKey = getFirstCollidingInstanceKeyOf(key);
        if (collidingKey !== undefined) mergeInstances(key, collidingKey)
    }


    return { get instances () { return instancesRef.current}, update, add, remove, removeAllWithSound, mergeIfPossible, creationEvents }
}
