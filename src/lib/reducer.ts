import type {WorkbenchState,IntelligenceItem,InboxItem,Competitor,Idea,ContentItem,SourceRef,RecordStatus,IdeaStatus} from "../types";
import {mockIntelligence} from "../data/mock-intelligence";
import {mockInbox} from "../data/mock-inbox";
import {mockIdeas,makeIdea} from "../data/mock-ideas";
import {mockCompetitors} from "../data/mock-competitors";
import {mockContent} from "../data/mock-content";
export const initialState:WorkbenchState={intelligence:mockIntelligence,inbox:mockInbox,ideas:mockIdeas,competitors:mockCompetitors,content:mockContent};
export type Action=
 |{type:"addInbox";item:InboxItem}|{type:"addIntelligence";item:IntelligenceItem}
 |{type:"status";kind:"inbox"|"intelligence";ids:string[];status:RecordStatus}
 |{type:"analyze";id:string;patch:Partial<InboxItem>}
 |{type:"convert";source:SourceRef}
 |{type:"addCompetitor";item:Competitor}|{type:"monitor";id:string}
 |{type:"addIdea";item:Idea}|{type:"editIdea";id:string;patch:Partial<Idea>}
 |{type:"moveIdea";id:string;status:IdeaStatus;beforeId?:string}
 |{type:"addContent";item:ContentItem};
export function linkedIdeaId(source:SourceRef){return `idea-${source.kind}-${source.id}`}
export function reducer(state:WorkbenchState,action:Action):WorkbenchState{
 switch(action.type){
 case "addInbox":return {...state,inbox:[action.item,...state.inbox]};
 case "addIntelligence":return {...state,intelligence:[action.item,...state.intelligence]};
 case "status":return {...state,[action.kind]:state[action.kind].map(x=>action.ids.includes(x.id)?{...x,status:action.status}:x)};
 case "analyze":return {...state,inbox:state.inbox.map(x=>x.id===action.id?{...x,...action.patch}:x)};
 case "convert":{
 const source=state[action.source.kind].find(x=>x.id===action.source.id);if(!source)return state;
 const existing=state.ideas.find(x=>x.sourceIds.some(s=>s.kind===action.source.kind&&s.id===source.id));
 const idea={...makeIdea(linkedIdeaId(action.source),source.title),sourceIds:[action.source],platforms:[source.platform],tags:source.tags,score:source.aiScore??80};
 return {...state,[action.source.kind]:state[action.source.kind].map(x=>x.id===source.id?{...x,status:"已转选题"}:x),ideas:existing?state.ideas:[idea,...state.ideas]};}
 case "addCompetitor":return {...state,competitors:[action.item,...state.competitors]};
 case "monitor":return {...state,competitors:state.competitors.map(x=>x.id===action.id?{...x,monitored:!x.monitored}:x)};
 case "addIdea":return {...state,ideas:[action.item,...state.ideas]};
 case "editIdea":return {...state,ideas:state.ideas.map(x=>x.id===action.id?{...x,...action.patch}:x)};
 case "moveIdea":{
 const item=state.ideas.find(x=>x.id===action.id);if(!item||action.id===action.beforeId)return state;
 const rest=state.ideas.filter(x=>x.id!==item.id);let index=action.beforeId?rest.findIndex(x=>x.id===action.beforeId):-1;
 if(index<0)index=rest.length;
 rest.splice(index,0,{...item,status:action.status});return {...state,ideas:rest};}
 case "addContent":return {...state,content:action.item.ideaId?[...state.content.filter(x=>x.ideaId!==action.item.ideaId),action.item]:[action.item,...state.content]};
 }
}
