import {clsx,type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs))}
export function outlierLabel(value:number){return value<1.5?"普通":value<=3?"值得注意":"异常爆款"}
export function formatCount(value:number){return value>=10000?`${(value/10000).toFixed(1)}万`:value.toLocaleString("zh-CN")}
export function formatDate(value:string){return new Intl.DateTimeFormat("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Shanghai",hour12:false}).format(new Date(value))}
export function validUrl(value:string){try{const url=new URL(value);return url.protocol==="https:"||url.protocol==="http:"}catch{return false}}
