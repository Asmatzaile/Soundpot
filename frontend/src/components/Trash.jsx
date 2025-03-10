import { useContext, useEffect, useRef, useState } from "react"
import LibraryContext from "@context/LibraryContext"
import { isSelectorInPoint } from "@utils/dom";
import { TrashIcon } from "lucide-react";

export default function Trash() {
    const { removeSound, flagSound, unflagSound } = useContext(LibraryContext);

    const [instancesAbove, setInstancesAbove] = useState(new Set);
    const instanceSounds = useRef(new Map())

    const isEventAbove = e => isSelectorInPoint("#trash", {x: e.clientX, y: e.clientY});

    const unlistInstance = (instanceId) => {
        if (!instanceSounds.current.has(instanceId)) return;
        const instanceSound = instanceSounds.current.get(instanceId, instanceSounds);
        instanceSounds.current.delete(instanceId);
        if (![...instanceSounds.current.values()].includes(instanceSound)) unflagSound(instanceSound, "trash")
        setInstancesAbove(prev => {
            const n = new Set(prev);
            n.delete(instanceId);
            return n;
        })
    }
    const listInstance = (instanceId, instanceSound) => {
        if (![...instanceSounds.current.values()].includes(instanceSound)) flagSound(instanceSound, "trash")
        instanceSounds.current.set(instanceId, instanceSound);
        setInstancesAbove(prev => {
            const n = new Set(prev);
            n.add(instanceId);
            return n;
        })
    }

    useEffect(() => {
        const controller = new AbortController();
        document.addEventListener("dragend", (e) => {
            const soundName = e.target.dataset.sound;
            if (!isEventAbove(e)) return;
            unlistInstance(e.target.dataset.instanceId);
            removeSound(soundName);
        }, { signal: controller.signal });

        document.addEventListener("drag", (e) => {
            if (isEventAbove(e)) listInstance(e.target.dataset.instanceId, e.target.dataset.sound);
            else unlistInstance(e.target.dataset.instanceId);
        }, { signal: controller.signal });

        return () => controller.abort();
    }, []);

    const fullSize = 96; // size-24, the same as sound instances
    const smallSize = 64; // size-16, the same as recorder and library sounds
    const actualSize = instancesAbove.size > 0 ? fullSize : smallSize
    const inset = (fullSize - actualSize) / 2;

    return <div id="trash" className="relative bg-stone-950 size-24 rounded-3xl grid place-content-center"
        style={{ clipPath: `inset(${inset}px round 24px)`, transition: "clip-path 0.1s"}}>
        <TrashIcon className="text-stone-800 size-7"/>
    </div>
}
