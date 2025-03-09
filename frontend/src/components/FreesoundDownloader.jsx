import { useContext, useEffect, useRef, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import * as api from "@api/freesoundApi"
import { DownloadRandomIcon } from "./DownloadRandomIcon"
import LibraryContext from "@context/LibraryContext";
import useDummyInstanceManager from "@hooks/useDummyInstanceManager";
import { getElementCenter, isSelectorInPoint } from "@utils/dom";
import { useSettings } from "@context/SettingsContext";

const cooldownTime = 10000;
const states = {
    LOADING: 'loading',
    UNAUTHORIZED: 'unauthorized',
    AUTHENTICATING: 'authenticating',
    COOLDOWN: 'cooldown',
    READY: 'ready',
}

export default function FreesoundDownloader({ instanceManager }) {
    const { settings } = useSettings();
    const { addSoundToLibrary } = useContext(LibraryContext);
    const dummyInstance = useDummyInstanceManager(instanceManager);
    const abortControllerRef = useRef();
    const divRef = useRef()
    const [state, setState] = useState(states.LOADING);
    const [anims, animApi] = useSpring(() => ({
        progress: 0,
        scale: 1,
        config: key => {
            if (key === 'progress') return {duration: cooldownTime}
        }
    }), []);

    const authenticate = async () => {
        const key = import.meta.env.VITE_FREESOUND_KEY
        const authorized = await api.authenticate(key);
        setState(authorized ? states.READY : states.UNAUTHORIZED)
    }
    useEffect(() => {
        authenticate();
    }, []);

    const handleClick = async(e) => {
        if (state === states.READY) getSound(e);
    }

    const onPointerUp = async(e) => {
        const { clientX: x, clientY: y} = e;
        if (isSelectorInPoint("#trash", {x, y})) abortControllerRef.current?.abort();
    }

    const onCooldown = () => {
        setState(states.COOLDOWN);
        animApi.set({progress: 0});
        animApi.start({progress: 1});
        setTimeout(onReload, cooldownTime);
    }

    const onReload = () => {
        setState(states.READY);
        animApi.set({scale: 1.1});
        animApi.start({scale: 1})
    }

    const getSound = async (e) => {
        dummyInstance.create(e, {x: getElementCenter(divRef.current).x, y: getElementCenter(divRef.current).y}, instanceManager.creationEvents.FREESOUND);
        onCooldown();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        document.addEventListener("pointerup", onPointerUp, {once: true}) // because we created the instance. TODO: as with recorder, could lead to bugs with multitouch
        const [sound, metadata] = await api.getRandomSound({ allowExplicit: settings.allowExplicit, signal: controller.signal });
        if (sound === undefined) return dummyInstance.remove();
        const newSoundName = await addSoundToLibrary(sound, { ...metadata, origin: 'freesound' });
        dummyInstance.updateSoundName(newSoundName);
    }

    const stateClasses = {
        [states.READY]: "border-4 cursor-grab text-stone-50 rounded-full",
        [states.LOADING]: "bg-stone-400 text-stone-800 rounded-3xl",
        [states.COOLDOWN]: "border-current border-4 text-stone-400 rounded-3xl progress-border border-transparent",
        [states.UNAUTHORIZED]: "bg-stone-600 text-stone-800 rounded-3xl"
    }

    return <animated.div ref={divRef} onPointerDown={handleClick} style={state === states.COOLDOWN ? {
        // in the future, background-clip: border-area will be available, removing the need for the first line
        background: anims.progress.to(value=> `linear-gradient(var(--color-stone-800), var(--color-stone-800)) padding-box,
        conic-gradient(var(--color-stone-400) 0turn ${value}turn, var(--color-stone-900) ${value}turn 1turn) border-box`),
    } : {scale: anims.scale}}
        className={`${stateClasses[state]} size-16 grid place-content-center`}>
        <DownloadRandomIcon className="size-7" />
    </animated.div>
}
