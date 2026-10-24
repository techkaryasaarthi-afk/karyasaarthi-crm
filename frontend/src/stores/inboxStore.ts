import { create } from "zustand";
export const useInboxStore = create((set) => ({ activeThread: null }));
