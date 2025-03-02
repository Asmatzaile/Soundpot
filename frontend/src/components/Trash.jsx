import { useContext, useEffect, useState } from "react"
import LibraryContext from "@context/LibraryContext"
import { isSelectorInPoint } from "@utils/dom";
import { TrashIcon } from "lucide-react";

export default function Trash() {
    const { removeSound } = useContext(LibraryContext);

    const [isInstanceAbove, setIsInstanceAbove] = useState(false);

    const isEventAbove = e => isSelectorInPoint("#trash", {x: e.clientX, y: e.clientY});
    useEffect(() => {
    const controller = new AbortController();

    document.addEventListener("dragend", (e) => {
        const soundName = e.target.dataset.sound;
        if (isEventAbove(e)) {
            setIsInstanceAbove(false);
            if (soundName === undefined) return; // this would happen, for example, if we were recording and automatically discarded it
            removeSound(soundName);
        }
    }, { signal: controller.signal });

    document.addEventListener("drag", (e) => {
        setIsInstanceAbove(isEventAbove(e));
    }, { signal: controller.signal });

    return () => controller.abort();
    }, []);

    const fullSize = 96; // size-24, the same as sound instances
    const smallSize = 64; // size-16, the same as recorder and library sounds
    const actualSize = isInstanceAbove ? fullSize : smallSize
    const inset = (fullSize - actualSize) / 2;

    return <div id="trash" className="relative bg-stone-950 size-24 rounded-3xl grid place-content-center"
        style={{ clipPath: `inset(${inset}px round 24px)`, transition: "clip-path 0.1s"}}>
        <TrashIcon className="text-stone-800 size-7"/>
    </div>
}
