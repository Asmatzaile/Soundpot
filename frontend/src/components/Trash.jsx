import { useContext, useEffect } from "react"
import LibraryContext from "@context/LibraryContext"
import { isSelectorInPoint } from "@utils/dom";

export default function Trash() {
    const { removeSound } = useContext(LibraryContext);

    useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("dragend", (e) => {
        const { clientX: x, clientY: y, target} = e;
        const soundName = target.dataset.sound;
        if (soundName === undefined) return; // this would happen, for example, if we were recording and automatically discarded it
        if (isSelectorInPoint("#trash", {x, y})) removeSound(soundName);
    }, {signal: controller.signal})
    return () => controller.abort();
    }, [])

    return <div id="trash">Trash</div>
}
