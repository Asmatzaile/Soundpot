import { useContext, useEffect, useRef } from "react";
import { XIcon } from "lucide-react";
import LibraryContext from "@context/LibraryContext";

export function CreditsModal({ close }) {
    const library = useContext(LibraryContext);

    const dialogRef = useRef();
    useEffect(() => {
        dialogRef.current.showModal();

        const controller = new AbortController();
        document.addEventListener("keydown", e => {
            if (e.key !== "Escape") return;
            e.preventDefault();
            close();
        }, { signal: controller.signal })
        return () => controller.abort();
    }, []);


    return <dialog ref={dialogRef} className="grid gap-y-0.5 place-self-center rounded-lg bg-stone-900 text-stone-50 min-w-72">
        <div className="grid grid-cols-3 items-center bg-stone-700 px-4 py-2">
            <span className="font-bold text-xl col-start-2">CREDITS</span>
            <XIcon className="cursor-pointer col-start-3 justify-self-end" onClick={close}/>
        </div>
        <div className="grid grid-cols-2 items-center gap-y-0.5">
            <div className="grid grid-cols-subgrid col-span-full justify-between bg-stone-700 px-6 py-2">
                <span className="uppercase">
                    Concept <br/>
                    Design <br/>
                    Development
                </span>
                <span className="justify-self-end self-center"><a href="https://gorkaegino.com" className="underline">Gorka Egino</a></span>
            </div>
            <div className="grid grid-cols-subgrid col-span-full justify-between bg-stone-700 px-6 py-2">
                <span className="uppercase">ML Model</span>
                <span className="justify-self-end self-center"><a href="https://huggingface.co/stabilityai/stable-audio-open-1.0" className="underline">Stable Audio Open</a></span>
            </div>
            <div className="grid grid-cols-subgrid col-span-full justify-between bg-stone-700 px-6 py-2">
                <span className="uppercase">Icons</span>
                <span className="justify-self-end self-center"><a href="https://lucide.dev/icons/" className="underline">Lucide</a></span>
            </div>
            { library.containsFreesoundSounds() &&
            <div className="grid grid-cols-subgrid col-span-full justify-between bg-stone-700 px-6 py-2">
                <span className="uppercase">Samples</span>
                <span className="justify-self-end self-center underline cursor-pointer" onClick={library.downloadAttribution}>Freesound</span>
            </div>
            }
            
        </div>
    </dialog>
}