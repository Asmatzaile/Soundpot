import { useEffect, useState } from "react";
import { useSettings } from "@context/SettingsContext";

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

    return <div className="absolute isolate grid w-full h-full" style={{ background: "#0009", zIndex }}> 
        <dialog className="grid gap-4 place-self-center p-4 rounded-lg bg-stone-700 text-stone-50 min-w-72">
        SETTINGS
        <label className="flex justify-center">
            Mic delay (ms)
          <input
            type="number"
            min="0"
            max="1000"
            size="5"
            value={localSettings.micDelay}
            onChange={(e) =>
              setLocalSettings({ ...localSettings, micDelay: e.target.value })
            }
            className="ml-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-1 justify-self-end">
            <button className="text-stone-200 rounded-lg py-0.5 px-1 min-w-20" onClick={close}>CLOSE</button>
            <button className="border-stone-800 border-2 bg-stone-800 rounded-lg min-w-20 py-0.5 px-1" onClick={handleSave}>SAVE</button>
        </div>
        </dialog>
    </div>
}