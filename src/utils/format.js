export const fmt = {
  price: (v) => v==null ? '—' : `$${Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,
  pct:   (v) => v==null ? '—' : `${v>=0?'+':''}${Number(v).toFixed(2)}%`,
  num2:  (v) => v==null ? '—' : Number(v).toFixed(2),
  num3:  (v) => v==null ? '—' : Number(v).toFixed(3),
  int:   (v) => v==null ? '—' : Math.round(v).toLocaleString('en-US'),
  vol:   (v) => { if(v==null) return '—'; if(v>=1e9) return `${(v/1e9).toFixed(1)}B`; if(v>=1e6) return `${(v/1e6).toFixed(1)}M`; return Math.round(v).toString() },
  date:  (v) => v==null ? '—' : v.slice(0,10),
  rsi:   (v) => v==null ? '—' : Number(v).toFixed(1),
}

export function signClass(v) {
  if (v==null) return ''
  return v > 0 ? 'positive' : v < 0 ? 'negative' : ''
}