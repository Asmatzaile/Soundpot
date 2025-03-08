import { useContext, useEffect, useState } from "react";
import { useSpring, animated } from "@react-spring/web";
import * as api from "@api/freesoundApi"
import { DownloadRandomIcon } from "./DownloadRandomIcon"
import LibraryContext from "@context/LibraryContext";

const cooldownTime = 10000;
const states = {
    LOADING: 'loading',
    UNAUTHORIZED: 'unauthorized',
    AUTHENTICATING: 'authenticating',
    COOLDOWN: 'cooldown',
    READY: 'ready',
}

export default function FreesoundDownloader() {
    const { addSoundToLibrary } = useContext(LibraryContext);
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

    const handleClick = async() => {
        if (state === states.READY) getSound();
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

    const getSound = async () => {
        onCooldown();
        const [sound, metadata] = await api.getRandomSound();
        addSoundToLibrary(sound, { ...metadata, origin: 'freesound' })
    }

    const stateClasses = {
        [states.READY]: "border-4 cursor-pointer text-stone-50 rounded-full",
        [states.LOADING]: "bg-stone-400 text-stone-800 rounded-3xl",
        [states.COOLDOWN]: "border-current border-4 text-stone-400 rounded-3xl progress-border border-transparent",
        [states.UNAUTHORIZED]: "bg-stone-600 text-stone-800 rounded-3xl"
    }

    return <animated.div onPointerDown={handleClick} style={state === states.COOLDOWN ? {
        // in the future, background-clip: border-area will be available, removing the need for the first line
        background: anims.progress.to(value=> `linear-gradient(var(--color-stone-800), var(--color-stone-800)) padding-box,
        conic-gradient(var(--color-stone-400) 0turn ${value}turn, var(--color-stone-900) ${value}turn 1turn) border-box`),
    } : {scale: anims.scale}}
        className={`${stateClasses[state]} size-16 grid place-content-center`}>
        <DownloadRandomIcon className="size-7" />
    </animated.div>
}
