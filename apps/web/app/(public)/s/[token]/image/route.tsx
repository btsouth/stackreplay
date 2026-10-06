import { decodeAnyShareToken } from "@stackreplay/share";
import { ImageResponse } from "next/og";
import { premiumShareImageFonts } from "@/components/share/share-image-font";
import { compactNumber, recapUsd } from "@/lib/recap-card";
import { resolveShareParam } from "@/lib/share-link-store";
import { sharedRecap } from "@/lib/shared-recap";
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}):Promise<Response> {
 const resolved=await resolveShareParam((await params).token);
 const decoded=resolved.kind==="token"?await decodeAnyShareToken(resolved.token):{ok:false as const};
 const r=decoded.ok?sharedRecap(decoded.snapshot):undefined;
 return new ImageResponse(<div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",background:"#181d19",color:"#f5f0e6",padding:60,fontFamily:"Instrument Sans",justifyContent:"space-between"}}>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:24}}><span>↺ StackReplay</span><span>My coding recap</span></div>
  <div style={{display:"flex",gap:70,alignItems:"baseline"}}><div style={{display:"flex",flexDirection:"column"}}><strong style={{fontSize:110,letterSpacing:"-.06em"}}>{r?.tokens===undefined?"Unreported":compactNumber(r.tokens)}</strong><span style={{fontSize:22,color:"#b5b8aa"}}>total tokens</span></div><div style={{display:"flex",flexDirection:"column"}}><strong style={{fontSize:76,color:"#efaa87",letterSpacing:"-.05em"}}>{r?.usd===undefined?"Value unreported":recapUsd(r.usd)}</strong><span style={{fontSize:22,color:"#b5b8aa"}}>at API prices</span></div></div>
  <div style={{display:"flex",flexDirection:"column",gap:10}}>{r?.models.slice(0,3).map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:20,fontSize:21}}><span style={{width:290}}>{m.name}</span><div style={{display:"flex",width:300,height:6,background:"#343c34"}}><div style={{width:`${100*m.tokens/Math.max(1,r.models[0]?.tokens??0)}%`,background:m.family==="anthropic"?"#dfaa82":m.family==="openai"?"#93c5ad":"#a9cce2"}} /></div><span>{compactNumber(m.tokens)}</span></div>)}</div>
  <div style={{display:"flex",gap:32,fontSize:20,color:"#b5b8aa"}}>{r?.sessions!==undefined && <span>{r.sessions.toLocaleString()} sessions</span>}{r?.days!==undefined && <span>{r.days} active days</span>}{r?.streak!==undefined && <span>{r.streak} days · longest streak</span>}<span>Reported usage, not a bill</span></div>
 </div>,{width:1200,height:630,fonts:premiumShareImageFonts(),headers:{"cache-control":decoded.ok?"public, max-age=31536000, immutable":"public, max-age=60"}});
}
