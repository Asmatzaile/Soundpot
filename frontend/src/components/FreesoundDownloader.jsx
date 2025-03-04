import { useContext, useEffect } from "react";
import * as api from "@api/freesoundApi"
import { DownloadRandomIcon } from "./DownloadRandomIcon"
import LibraryContext from "@context/LibraryContext";

export default function FreesoundDownloader() {
    const { addSoundToLibrary } = useContext(LibraryContext);

    useEffect(() => {
        (async()=> {
            const key = import.meta.env.VITE_FREESOUND_KEY
            await api.authenticate(key);
        })()        
    }, [])
    const handleClick = async() => {
        const [sound, metadata] = await api.getRandomSound();
        addSoundToLibrary(sound, { ...metadata, origin: 'freesound' })
    }

    return <div onPointerDown={handleClick} className="size-16 rounded-3xl bg-stone-50 grid place-content-center cursor-pointer">
        <DownloadRandomIcon className="size-7 text-stone-800" />
    </div>
}
