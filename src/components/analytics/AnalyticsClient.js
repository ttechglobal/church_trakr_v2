'use client'

import { useState, useMemo } from 'react'
import BackButton from '@/components/ui/BackButton'
import { fmtDate } from '@/lib/utils'
import { TrendingUp, Users, Star, CheckCircle, BarChart3, Calendar } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDk:'#e0dbd0',
  success:'#16a34a', error:'#dc2626',
}
const PERIODS = [
  {label:'This Month',value:'1m'},{label:'Last 3 Months',value:'3m'},
  {label:'Last 6 Months',value:'6m'},{label:'This Year',value:'1y'},
]
function periodStart(p){
  const n=new Date()
  if(p==='1m') return new Date(n.getFullYear(),n.getMonth(),1)
  if(p==='3m') return new Date(n.getFullYear(),n.getMonth()-2,1)
  if(p==='6m') return new Date(n.getFullYear(),n.getMonth()-5,1)
  return new Date(n.getFullYear(),0,1)
}
function CTip({active,payload,label,unit=''}){
  if(!active||!payload?.length) return null
  return <div style={{background:'#fff',border:'1px solid rgba(26,58,42,0.12)',borderRadius:10,padding:'8px 12px',boxShadow:'0 4px 16px rgba(26,58,42,0.12)',fontSize:13}}>
    <p style={{color:C.muted,marginBottom:4,fontSize:11}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color||C.forest,fontWeight:700,margin:'2px 0'}}>{p.value}{unit}</p>)}
  </div>
}
function KPI({icon,label,value,color,sub}){
  return <div className="card">
    <div className="mb-2" style={{color,opacity:0.8}}>{icon}</div>
    <p className="font-display text-2xl font-bold" style={{color,lineHeight:1}}>{value}</p>
    <p className="text-xs font-semibold text-forest mt-1">{label}</p>
    {sub&&<p className="text-xs text-mist mt-0.5">{sub}</p>}
  </div>
}
function ChartCard({title,subtitle,children,empty}){
  return <div className="card">
    <div className="mb-4">
      <h3 className="font-display text-base font-semibold text-forest">{title}</h3>
      {subtitle&&<p className="text-xs text-mist mt-0.5">{subtitle}</p>}
    </div>
    {empty?<div className="py-10 text-center"><p className="text-sm text-mist">Not enough data yet</p></div>:children}
  </div>
}
export default function AnalyticsClient({church,groups,sessions,members,firstTimers,awayMembers,followUpData}){
  const [period,setPeriod]=useState('3m')
  const start=periodStart(period)
  const periodSessions=useMemo(()=>
    sessions.filter(s=>new Date(s.date+'T00:00:00')>=start&&s.groups?.name!=='First Timers'&&(s.attendance_records??[]).some(r=>r.member_id!==null))
    .sort((a,b)=>a.date.localeCompare(b.date)),[sessions,start])
  const activeMembers=members.filter(m=>m.status==='active')
  const attendanceTrend=useMemo(()=>{
    const byDate={}
    for(const s of periodSessions){
      if(!byDate[s.date])byDate[s.date]={present:0,total:0}
      const recs=s.attendance_records??[]
      byDate[s.date].present+=recs.filter(r=>r.present).length
      byDate[s.date].total+=recs.length
    }
    return Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([date,{present,total}])=>({
      date,label:new Date(date+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}),
      present,total,rate:total>0?Math.round((present/total)*100):0
    }))
  },[periodSessions])
  const avgRate=attendanceTrend.length>0?Math.round(attendanceTrend.reduce((s,d)=>s+d.rate,0)/attendanceTrend.length):null
  const bestDay=attendanceTrend.reduce((b,d)=>(!b||d.rate>b.rate)?d:b,null)
  const worstDay=attendanceTrend.reduce((w,d)=>(!w||d.rate<w.rate)?d:w,null)
  const memberGrowth=useMemo(()=>{
    const now=new Date(),mCount=period==='1m'?3:period==='3m'?4:period==='6m'?7:13
    return Array.from({length:mCount},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-(mCount-1-i),1)
      const label=d.toLocaleDateString(undefined,{month:'short',year:'2-digit'})
      const end=new Date(d.getFullYear(),d.getMonth()+1,0)
      return{label,count:members.filter(m=>m.created_at&&new Date(m.created_at)<=end).length}
    })
  },[members,period])
  const ftTrend=useMemo(()=>{
    const now=new Date(),mCount=period==='1m'?2:period==='3m'?3:period==='6m'?6:12
    const byM={}
    for(const ft of firstTimers.filter(ft=>new Date(ft.date+'T00:00:00')>=start)){
      const k=new Date(ft.date+'T00:00:00').toLocaleDateString(undefined,{month:'short',year:'2-digit'})
      byM[k]=(byM[k]||0)+1
    }
    return Array.from({length:mCount},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-(mCount-1-i),1)
      const label=d.toLocaleDateString(undefined,{month:'short',year:'2-digit'})
      return{label,count:byM[label]||0}
    })
  },[firstTimers,start,period])
  const fuStats=useMemo(()=>{
    const entries=Object.values(followUpData),total=entries.length,reached=entries.filter(e=>e.reached).length
    return{total,reached,pending:total-reached,rate:total>0?Math.round((reached/total)*100):null}
  },[followUpData])
  const topAtt=useMemo(()=>{
    const cnt={},tot={}
    for(const s of periodSessions)for(const r of(s.attendance_records??[])){
      if(!r.member_id)continue
      tot[r.member_id]=(tot[r.member_id]||0)+1
      if(r.present)cnt[r.member_id]=(cnt[r.member_id]||0)+1
    }
    return Object.entries(cnt).map(([id,c])=>({
      id,name:members.find(m=>m.id===id)?.name||'Unknown',
      attended:c,total:tot[id]||c,rate:Math.round((c/(tot[id]||c))*100)
    })).sort((a,b)=>b.rate-a.rate||b.attended-a.attended).slice(0,5)
  },[periodSessions,members])
  if(!sessions.length) return(
    <div className="page-content"><BackButton />
      <div className="card text-center py-16 space-y-4">
        <BarChart3 size={48} className="text-mist mx-auto" strokeWidth={1}/>
        <h2 className="font-display text-xl font-semibold text-forest">No data yet</h2>
        <p className="text-sm text-mist max-w-xs mx-auto">Take attendance to start seeing analytics.</p>
        <a href="/attendance" className="btn btn-primary inline-flex gap-2 mt-2"><Calendar size={15}/>Take Attendance</a>
      </div>
    </div>
  )
  return(
    <div className="page-content pb-12">
      <BackButton/>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">Analytics</h1>
          <p className="text-sm text-mist mt-0.5">{church.name}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map(p=>(
            <button key={p.value} onClick={()=>setPeriod(p.value)}
              className={`btn btn-sm ${period===p.value?'btn-primary':'btn-outline'}`}>{p.label}</button>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
        <KPI icon={<TrendingUp size={18}/>} label="Avg Attendance" value={avgRate!==null?`${avgRate}%`:'—'} color={avgRate!==null?(avgRate>=70?C.success:C.error):C.muted} sub={`${attendanceTrend.length} sessions`}/>
        <KPI icon={<Users size={18}/>} label="Active Members" value={activeMembers.length} color={C.forest} sub={`${members.filter(m=>m.status==='inactive').length} inactive`}/>
        <KPI icon={<Star size={18}/>} label="First Timers" value={firstTimers.filter(ft=>new Date(ft.date+'T00:00:00')>=start).length} color={C.goldDk} sub="this period"/>
        <KPI icon={<CheckCircle size={18}/>} label="Follow-Up Rate" value={fuStats.rate!==null?`${fuStats.rate}%`:'—'} color={fuStats.rate!==null?(fuStats.rate>=70?C.success:C.gold):C.muted} sub={`${fuStats.reached}/${fuStats.total} reached`}/>
      </div>
      {bestDay&&worstDay&&bestDay.date!==worstDay.date&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div className="card" style={{borderLeft:`3px solid ${C.success}`}}>
            <p className="text-xs text-mist font-medium uppercase tracking-wide mb-1">Best Sunday</p>
            <p className="font-display text-xl font-bold" style={{color:C.success}}>{bestDay.rate}%</p>
            <p className="text-xs text-mist mt-0.5">{fmtDate(bestDay.date)}</p>
          </div>
          <div className="card" style={{borderLeft:`3px solid ${C.error}`}}>
            <p className="text-xs text-mist font-medium uppercase tracking-wide mb-1">Lowest Sunday</p>
            <p className="font-display text-xl font-bold" style={{color:C.error}}>{worstDay.rate}%</p>
            <p className="text-xs text-mist mt-0.5">{fmtDate(worstDay.date)}</p>
          </div>
        </div>
      )}
      <ChartCard title="Attendance Rate" subtitle="% of members present each Sunday" empty={attendanceTrend.length<2}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={attendanceTrend} margin={{top:8,right:8,bottom:0,left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)"/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
            <Tooltip content={<CTip unit="%"/>}/>
            <Line type="monotone" dataKey="rate" stroke={C.forest} strokeWidth={2.5} dot={{fill:C.gold,r:4,strokeWidth:0}} activeDot={{r:6,fill:C.gold}}/>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Weekly Headcount" subtitle="Members present each Sunday" empty={!attendanceTrend.length}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={attendanceTrend} margin={{top:4,right:8,bottom:0,left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <Tooltip content={<CTip/>}/>
            <Bar dataKey="present" radius={[4,4,0,0]}>
              {attendanceTrend.map((e,i)=><Cell key={i} fill={e.rate>=70?C.forest:e.rate>=50?C.gold:C.error} fillOpacity={0.85}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Member Growth" subtitle="Total members over time" empty={!members.length}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={memberGrowth} margin={{top:4,right:8,bottom:0,left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <Tooltip content={<CTip/>}/>
            <Bar dataKey="count" fill={C.forest} radius={[4,4,0,0]} fillOpacity={0.85}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="First Timers Per Month" subtitle="New visitors each month" empty={!firstTimers.length}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ftTrend} margin={{top:4,right:8,bottom:0,left:-20}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.muted}} tickLine={false} axisLine={false} allowDecimals={false}/>
            <Tooltip content={<CTip/>}/>
            <Bar dataKey="count" fill={C.goldDk} radius={[4,4,0,0]} fillOpacity={0.85}/>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {fuStats.total>0&&(
        <ChartCard title="Follow-Up Completion" subtitle="Absentees who were contacted">
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            <div style={{width:140,height:140,flexShrink:0}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{value:fuStats.reached},{value:fuStats.pending}]}
                    cx="50%" cy="50%" innerRadius={44} outerRadius={62} paddingAngle={3}
                    dataKey="value" startAngle={90} endAngle={-270}>
                    <Cell fill={C.success}/><Cell fill={C.ivoryDk}/>
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-display text-3xl font-bold text-forest">{fuStats.rate}%</p>
              <p className="text-xs text-mist">completion rate</p>
              <div className="space-y-1 mt-2">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-success"/><span className="text-sm text-forest">{fuStats.reached} reached</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:C.ivoryDk}}/><span className="text-sm text-mist">{fuStats.pending} pending</span></div>
              </div>
            </div>
          </div>
        </ChartCard>
      )}
      {topAtt.length>0&&(
        <div className="card">
          <h3 className="font-display text-base font-semibold text-forest mb-1">🏆 Top Attendees</h3>
          <p className="text-xs text-mist mb-4">Best records this period</p>
          <div className="space-y-3">
            {topAtt.map((m,i)=>(
              <div key={m.id} className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-mist w-5 text-center">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-forest truncate">{m.name}</p>
                  <p className="text-xs text-mist">{m.attended}/{m.total} sessions</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-16 bg-ivory-deeper rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${m.rate}%`,background:m.rate>=80?C.success:m.rate>=60?C.gold:C.error}}/>
                  </div>
                  <span className="text-xs font-bold text-forest w-9 text-right">{m.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
