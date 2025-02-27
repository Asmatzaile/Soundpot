import { useContext, useEffect } from "react"
import LibraryContext from "@context/LibraryContext"
import { isSelectorInPoint } from "@utils/dom";

export default function Thrash() {
    const { removeSound } = useContext(LibraryContext);

    useEffect(() => {
    const controller = new AbortController();
    document.addEventListener("dragend", (e) => {
        const { clientX: x, clientY: y, target} = e;
        const soundName = target.dataset.sound;
        if (isSelectorInPoint("#thrash", {x, y})) removeSound(soundName);
    }, {signal: controller.signal})
    return () => controller.abort();
    }, [])

    return <div id="thrash">Thrash</div>
}
