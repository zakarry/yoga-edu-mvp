import { createContext, useContext } from 'react';
// Explicit event-demo entry only; never persist this into a normal visit.
export const DirectoryDemoContext = createContext(false);
export const useDirectoryDemo = () => useContext(DirectoryDemoContext);
