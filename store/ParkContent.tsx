import React, { createContext, useContext, useState } from 'react';

// Define what data we want to keep track of
type ParkData = {
  name: string;
  lat: number;
  lng: number;
  distance?: number;
} | null;

interface ParkContextType {
  selectedPark: ParkData;
  setSelectedPark: (park: ParkData) => void;
}

const ParkContext = createContext<ParkContextType | undefined>(undefined);

export function ParkProvider({ children }: { children: React.ReactNode }) {
  const [selectedPark, setSelectedPark] = useState<ParkData>(null);

  return (
    <ParkContext.Provider value={{ selectedPark, setSelectedPark }}>
      {children}
    </ParkContext.Provider>
  );
}

// Custom hook so it's easy to use in your pages
export function usePark() {
  const context = useContext(ParkContext);
  if (context === undefined) {
    throw new Error('usePark must be used within a ParkProvider');
  }
  return context;
}