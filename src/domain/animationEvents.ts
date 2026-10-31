export interface EventDefinition {id:number;name:string;int:number;float:number;string:string;audio:string;volume:number;balance:number}
export interface EventKey {id:number;frame:number;int:number;float:number;string:string;volume:number;balance:number}
export interface EventTrack {event:number;keys:EventKey[]}
export interface EventKeyInput extends Omit<EventKey,'id'> {event:number;keyId?:number;payloadBits?:[number,number,number]}
export type EventPatch=Partial<Pick<EventDefinition,'int'|'float'|'string'|'audio'|'volume'|'balance'>>&{floatBits?:number;volumeBits?:number;balanceBits?:number};
export interface FiredEvent {event:number;key:EventKey}
/** Explicit FBones playback policy: forward (previous,current], optionally
 * including the initial boundary. Scrub/reverse does not fire events. */
export function eventsBetween(tracks:readonly EventTrack[],previous:number,current:number,includeStart=false):FiredEvent[]{
 if(!Number.isFinite(previous)||!Number.isFinite(current)||current<previous)return[];
 return tracks.flatMap(track=>track.keys.filter(key=>{const frame=Math.fround(key.frame);return frame<=current&&(frame>previous||includeStart&&frame===previous);}).map(key=>({event:track.event,key}))).sort((a,b)=>Math.fround(a.key.frame)-Math.fround(b.key.frame)||a.key.id-b.key.id);
}
