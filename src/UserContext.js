// src/UserContext.js
import React, { createContext, useState } from 'react';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null); // Armazena os dados do resultado

  return (
    <UserContext.Provider value={{ user, setUser, result, setResult }}>
      {children}
    </UserContext.Provider>
  );
};
