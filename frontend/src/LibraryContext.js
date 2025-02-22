import { createContext } from "react";

const LibraryContext = createContext({
    library: new Map(),
    addSoundToLibrary: () => {},
    addOnLoadListener: () => {},
});
export default LibraryContext;
