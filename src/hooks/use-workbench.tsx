"use client";
import {createContext,useContext,useReducer,type Dispatch,type ReactNode} from "react";
import {initialState,reducer,type Action} from "../lib/reducer";
import type {WorkbenchState} from "../types";
const Context=createContext<{state:WorkbenchState;dispatch:Dispatch<Action>}|null>(null);
export function WorkbenchProvider({children}:{children:ReactNode}){const [state,dispatch]=useReducer(reducer,initialState);return <Context.Provider value={{state,dispatch}}>{children}</Context.Provider>}
export function useWorkbench(){const value=useContext(Context);if(!value)throw new Error("WorkbenchProvider missing");return value;}
