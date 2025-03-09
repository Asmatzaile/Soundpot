import { createContext, useContext, useState } from "react";

const SettingsContext = createContext();

const defaultSettings = {
  micDelay: 0,
}
const browserSettings = JSON.parse(localStorage.getItem("settings"));

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({...defaultSettings, ...browserSettings})

  const updateSettings = (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    localStorage.setItem("settings", JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within a SettingsProvider");
  return context;
};