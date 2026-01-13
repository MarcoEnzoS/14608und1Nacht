import { useEffect, useState } from "react";
import { STORAGE_CURRENT_USER_KEY } from "@/lib/constants";

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    const val = localStorage.getItem(STORAGE_CURRENT_USER_KEY) || "";
    setCurrentUser(val);
  }, []);

  function loginAs(name: string) {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, name);
    setCurrentUser(name);
  }

  function logout() {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    setCurrentUser("");
  }

  return { currentUser, loginAs, logout };
}
