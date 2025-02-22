import { createContext } from "react";

const LibraryContext = createContext({
    library: new Map(),
    addSoundToLibrary: () => {},
});
export default LibraryContext;
