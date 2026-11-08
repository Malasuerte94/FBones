// Reuses the compiled-SFC/createRenderer host pattern from animation-split-controls.test.mjs.
// This is a synthetic Vue host, never a DOM/layout/GPU/OS input implementation.
import {createRenderer} from 'vue';
const windowListeners=new Map();
globalThis.document={title:'',activeElement:null,querySelector(){return null;},addEventListener(){},removeEventListener(){}};
globalThis.window={innerWidth:1440,innerHeight:900,performance:globalThis.performance,addEventListener(name,callback){if(!windowListeners.has(name))windowListeners.set(name,new Set());windowListeners.get(name).add(callback);},removeEventListener(name,callback){windowListeners.get(name)?.delete(callback);}};
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
globalThis.Document=class{};globalThis.ShadowRoot=class{};
function node(type,text=''){return{contains(other){return flatten(this).includes(other);},type,tagName:type.toUpperCase(),text,children:[],props:{},parent:null,listeners:new Map(),clientHeight:260,clientWidth:900,scrollLeft:0,scrollTop:0,
 getRootNode(){return document;},addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(callback);},removeEventListener(name,callback){this.listeners.get(name)?.delete(callback);},
 getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:900,height:260,right:900,bottom:260};},focus(){document.activeElement=this;},closest(selector){return selector==='.animation-timeline'?this:null;},querySelector(selector){return this.querySelectorAll(selector)[0]??null;},querySelectorAll(selector){return flatten(this).filter(n=>selector==='[data-timeline-key-id]'?n.props['data-timeline-key-id']!==undefined:selector==='[role=\"treeitem\"]'?n.props.role==='treeitem':selector.startsWith('.')?String(n.props.class??'').split(' ').includes(selector.slice(1)):n.type===selector);},
 get dataset(){return{timelineKeyId:this.props['data-timeline-key-id']};},matches(selector){return selector.split(',').includes(type);}};}
const body=node('body');
const renderer=createRenderer({querySelector:selector=>selector==='body'?body:null,createElement:type=>node(type),createText:text=>node('#text',text),createComment:text=>node('#comment',text),setText:(n,text)=>n.text=text,setElementText:(n,text)=>{n.text=text;n.children=[];},patchProp:(n,key,_old,value)=>{n.props[key]=value;if(key==='value'){n._value=value;n.value=String(value);}else if(key==='multiple'||key==='type')n[key]=value;},parentNode:n=>n.parent,nextSibling:n=>{const at=n.parent?.children.indexOf(n)??-1;return n.parent?.children[at+1]??null;},insert(n,parent,anchor=null){if(n.parent){const at=n.parent.children.indexOf(n);if(at>=0)n.parent.children.splice(at,1);}n.parent=parent;const at=anchor?parent.children.indexOf(anchor):-1;if(at<0)parent.children.push(n);else parent.children.splice(at,0,n);},remove(n){const at=n.parent?.children.indexOf(n)??-1;if(at>=0)n.parent.children.splice(at,1);n.parent=null;}});
function flatten(n){const result=[],stack=[n];while(stack.length){const current=stack.pop();result.push(current);for(let i=current.children.length-1;i>=0;i--)stack.push(current.children[i]);}return result;}
const event=(extra={})=>({button:0,clientX:100,clientY:20,ctrlKey:false,metaKey:false,shiftKey:false,preventDefault(){},stopPropagation(){},...extra});
function dispatch(name,value=event()){for(const callback of [...windowListeners.get(name)??[]])callback(value);}

export {renderer,node,flatten,event,dispatch,windowListeners};
