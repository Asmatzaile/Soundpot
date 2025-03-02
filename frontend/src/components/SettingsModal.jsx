import { useEffect, useState } from "react";
import { useSettings } from "@context/SettingsContext";
import { clamp } from "@utils/math";

export function SettingsModal({close}) {
    const { settings, updateSettings } = useSettings();
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSave = () => {
        updateSettings(localSettings);
        close();
    }
    useEffect(() => {
        const controller = new AbortController();
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") close();
        })
        return () => controller.abort();
    })
    const zIndex = 2147483647; // largest zindex posible

    const sanitize = value => value.replace(/\D/g, '');

    return <div className="absolute isolate grid w-full h-full" style={{ background: "#0009", zIndex }}> 
        <dialog className="grid gap-4 place-self-center p-4 rounded-lg bg-stone-700 text-stone-50 min-w-72">
        SETTINGS
        <div className="ml-4">
            <label className="flex justify-between">
                Mic delay
                <div>
                    <input
                    size="5"
                    value={localSettings.micDelay}
                    onChange={(e) =>
                        setLocalSettings({ ...localSettings, micDelay: clamp(sanitize(e.target.value), 0, 1000) })
                    }
                    className="ml-2 mr-1 bg-stone-800 rounded-md text-right px-2 no-arrows"
                    />
                ms
                </div>
            </label>
        </div>
        <div className="grid grid-cols-2 gap-1 justify-self-end">
            <button className="text-stone-200 rounded-lg py-0.5 px-1 min-w-20" onClick={close}>CLOSE</button>
            <button className="border-stone-800 border-2 bg-stone-800 rounded-lg min-w-20 py-0.5 px-1" onClick={handleSave}>SAVE</button>
        </div>
        </dialog>
    </div>
}