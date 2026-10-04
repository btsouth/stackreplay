import type { RecapPeriod } from "@/lib/recap";
/** Native radio keyboard semantics, entirely themed, no operating-system popup. */
export function PeriodControl({value,onChange}: {value:RecapPeriod;onChange:(value:RecapPeriod)=>void}) {
  return <fieldset className="recap-period" aria-label="Recap period"><legend className="sr-only">Recap period</legend>{([["30","30 days"],["90","90 days"],["all","All time"]] as const).map(([id,label])=><label key={id}><input type="radio" name="recap-period" value={id} checked={value===id} onChange={()=>onChange(id)}/><span>{label}</span></label>)}</fieldset>;
}
