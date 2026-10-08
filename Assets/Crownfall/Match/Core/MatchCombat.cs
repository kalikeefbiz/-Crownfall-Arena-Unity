using System;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed partial class MatchSimulation
    {
        public AimKind Targeting(MatchEntity p,AbilitySlot slot)
        {
            if(slot==AbilitySlot.Special)return p.Roster==FirstRosterSummoner.Riven?AimKind.Self:AimKind.Directional;
            if(p.Roster==FirstRosterSummoner.Kit)return slot==AbilitySlot.Skill2?AimKind.Self:AimKind.Directional;
            if(p.Roster==FirstRosterSummoner.Set)return slot==AbilitySlot.Skill1?AimKind.Self:slot==AbilitySlot.Ultimate?AimKind.Ground:AimKind.Directional;
            return slot==AbilitySlot.Skill2||slot==AbilitySlot.Ultimate||(slot==AbilitySlot.Skill1&&p.Pulse)?AimKind.Self:AimKind.Directional;
        }
        public double Range(MatchEntity p,AbilitySlot slot)
        {
            if(slot==AbilitySlot.Special)return p.Roster==FirstRosterSummoner.Kit?26:0;
            if(p.Roster==FirstRosterSummoner.Kit)return new double[]{kitBasic.Range,3,4.2,23}[(int)slot];
            if(p.Roster==FirstRosterSummoner.Set)return new double[]{1.65,0,3.6,14}[(int)slot];
            return new double[]{5.2,p.Pulse?3.8:5.2,0,6}[(int)slot];
        }
        public string AbilityName(MatchEntity p,AbilitySlot slot)
        {
            if(p.Roster==FirstRosterSummoner.Kit)return new[]{"Solar Whip","Ember Step","Flame Burst","Firestorm Ascent","Expellant Blast"}[(int)slot];
            if(p.Roster==FirstRosterSummoner.Set)return new[]{"Panther Claw","War Cry","Predatory Combo","Panther Fist",""}[(int)slot];
            return new[]{p.Pulse?"Percussive Pulse":"Reso Blades",p.Pulse?"Percussive Solo":"Elf Dance","AMP'D","Death Scream","Switch Stance"}[(int)slot];
        }
        public double Cooldown(MatchEntity p,AbilitySlot slot)
        {
            if(p.Roster==FirstRosterSummoner.Kit)return new double[]{kitBasic.Cooldown,6,7.5,60,0}[(int)slot];
            if(p.Roster==FirstRosterSummoner.Set)return new double[]{1,10,8.5,65,0}[(int)slot];
            return new double[]{.95,p.Pulse?6:5.5,9,65,3}[(int)slot];
        }
        public bool CanCast(MatchEntity p,AbilitySlot slot)
        {
            if(!Active||!p.Alive||p.StunnedUntil>Now||p.Locked||p.ReadyAt[(int)slot]>Now+1e-9)return false;
            if(slot==AbilitySlot.Ultimate&&p.UltimateMeter<100)return false;
            if(slot==AbilitySlot.Special&&(p.Roster==FirstRosterSummoner.Set||(p.Roster==FirstRosterSummoner.Kit&&p.BlastUntil<=Now)))return false;
            if(p.Roster==FirstRosterSummoner.Riven&&slot==AbilitySlot.Basic&&!p.Pulse&&p.Returning)return false;
            return true;
        }
        public bool Cast(MatchEntity p,CastCommand c)
        {
            if(!HealthState.Finite(c.Direction.X)||!HealthState.Finite(c.Direction.Z)||!HealthState.Finite(c.Offset.X)||!HealthState.Finite(c.Offset.Z))return false;
            if(!CanCast(p,c.Slot))return false;
            int slot=(int)c.Slot;V2 dir=c.Direction.Length>.001?c.Direction.Normal:p.Aim;
            var aimKind=Targeting(p,c.Slot);
            if(aimKind==AimKind.Directional)p.Aim=dir;
            bool buff=(p.Roster==FirstRosterSummoner.Set&&c.Slot==AbilitySlot.Skill1)||(p.Roster==FirstRosterSummoner.Riven&&(c.Slot==AbilitySlot.Skill2||c.Slot==AbilitySlot.Special));
            if(!buff)p.ProtectedUntil=0;
            if(c.Slot==AbilitySlot.Ultimate)p.UltimateMeter=0;
            bool contact=p.Roster==FirstRosterSummoner.Set&&c.Slot==AbilitySlot.Skill2;
            if(!contact)p.ReadyAt[slot]=Now+Cooldown(p,c.Slot)*(c.Slot==AbilitySlot.Skill1||c.Slot==AbilitySlot.Skill2?p.Factor(Now,3):1);
            p.LastCast=c.Slot;p.CastAt=Now;p.CastAim=dir;
            Effect(p.Position,dir,.3,Math.Max(1,Range(p,c.Slot)),p.Team,"cast");
            if(p.Roster==FirstRosterSummoner.Kit)
            {
                switch(c.Slot)
                {
                    case AbilitySlot.Basic:
                        p.Combo=Now-p.ComboAt<=kitBasic.ComboWindow?(p.Combo+1)%kitBasic.ComboCount:0;p.ComboAt=Now;
                        Cone(p,dir,kitBasic.Range,kitBasic.Arc,kitBasic.Damage(p.Combo));break;
                    case AbilitySlot.Skill1:
                        p.Dash=new DashMotion{Direction=dir,Remaining=3,Speed=24,Width=.65,Damage=45,Empowered=p.Streak>=2};break;
                    case AbilitySlot.Skill2:Radial(p,p.Position,4.2,135);break;
                    case AbilitySlot.Ultimate:Shot(p,dir,23,16,1.15,200,true,true,false,true);break;
                    case AbilitySlot.Special:p.BlastUntil=0;Shot(p,dir,26,32,.85,0,false,true,true);break;
                }
            }
            else if(p.Roster==FirstRosterSummoner.Set)
            {
                switch(c.Slot)
                {
                    case AbilitySlot.Basic:p.Combo=Now-p.ComboAt<=1.15?(p.Combo+1)%3:0;p.ComboAt=Now;Cone(p,dir,1.65,Math.PI*.55,new double[]{55,60,70}[p.Combo]);break;
                    case AbilitySlot.Skill1:p.Buffs["warcry"]=new Modifier{Until=Now+3,Damage=.1,Mitigation=.15};break;
                    case AbilitySlot.Skill2:p.Dash=new DashMotion{Direction=dir,Remaining=3.6,Speed=16,Width=.5,Contact=true};break;
                    case AbilitySlot.Ultimate:
                        V2 offset=c.Offset.Length>.001?c.Offset:dir*14*.65;
                        if(offset.Length>14)offset=offset.Normal*14;
                        Actions.Add(new TimedAction{Owner=p,Position=p.Position+offset,At=Now+.7,Type=0});break;
                }
            }
            else
            {
                switch(c.Slot)
                {
                    case AbilitySlot.Basic:
                        if(p.Pulse)Shot(p,dir,5.2,12,.7,76,false);
                        else
                        {
                            WeaponCommand(p,dir);
                            if(c.HumanRelease&&p.WeaponNext==1){p.PendingSecond=true;p.PendingDirection=dir;p.PendingSecondAt=p.ReadyAt[0];}
                        }
                        break;
                    case AbilitySlot.Skill1:
                        if(p.Pulse){Radial(p,p.Position,3.8,120);Actions.Add(new TimedAction{Owner=p,At=Now,Until=Now+1.5,Type=2});}
                        else Actions.Add(new TimedAction{Owner=p,Direction=dir,At=Now,Type=1});break;
                    case AbilitySlot.Skill2:p.Buffs["amp"]=new Modifier{Until=Now+3,Damage=.1};break;
                    case AbilitySlot.Ultimate:Radial(p,p.Position,6,160,true,1.3);break;
                    case AbilitySlot.Special:p.Pulse=!p.Pulse;p.PendingSecond=false;break;
                }
            }
            return true;
        }
        void Cone(MatchEntity p,V2 direction,double range,double arc,double damage)
        {
            foreach(var t in Targets())if(Valid(p,t)&&ConeHitQuery.Contains(p.Position.Ground,t.Position.Ground,t.Radius,direction.Ground,range,arc))Damage(p,t,damage);
        }
        void Radial(MatchEntity p,V2 origin,double radius,double damage,bool summonersOnly=false,double stun=0)
        {
            foreach(var t in Targets())if(Valid(p,t,summonersOnly)&&V2.Distance(origin,t.Position)<=radius+t.Radius)
            {Damage(p,t,damage);if(t.Alive&&stun>0){t.StunnedUntil=Math.Max(t.StunnedUntil,Now+stun);t.PendingSecond=false;Interrupt(t);}}
            Effect(origin,p.Aim,.45,radius,p.Team,"radial");
        }
        Projectile Shot(MatchEntity p,V2 dir,double range,double speed,double width,double damage,bool piercing,bool only=false,bool lethal=false,bool grant=false)
        {
            var s=new Projectile{Owner=p,Position=p.Position,Direction=dir,Remaining=range,Speed=speed,Width=width,Damage=damage,Piercing=piercing,SummonersOnly=only,Lethal=lethal,Grant=grant};Projectiles.Add(s);return s;
        }
        void FinishDash(MatchEntity p,MatchEntity target=null)
        {
            var d=p.Dash;if(d==null)return;p.Dash=null;
            if(d.Contact)
            {
                p.ReadyAt[2]=Now+8.5*p.Factor(Now,3);
                if(target!=null)p.Sequence=new ComboMotion{Target=target.Id,Direction=d.Direction,Started=Now};
            }
            else p.Streak=d.Hits.Count==0||d.Empowered?0:p.Streak+1;
        }
        void AdvanceMotion(MatchEntity p,double dt)
        {
            var d=p.Dash;
            if(d!=null)
            {
                double amount=Math.Min(d.Remaining,d.Speed*dt);
                int n=Math.Max(1,(int)Math.Ceiling(amount/(p.Radius*.35)));
                for(int i=0;i<n&&p.Dash!=null;i++)
                {
                    V2 from=p.Position,to=from+d.Direction*(amount/n);
                    if(MatchMap.Blocked(to,p.Radius)){FinishDash(p);break;}
                    p.Position=to;d.Remaining-=amount/n;
                    MatchEntity nearest=null;double closest=double.PositiveInfinity;
                    foreach(var t in Targets())if(Valid(p,t)&&V2.Segment(t.Position,from,to)<=d.Width+t.Radius)
                    {
                        if(d.Contact){double distance=V2.Distance(from,t.Position);if(distance<closest){closest=distance;nearest=t;}}
                        else if(d.Hits.Add(t.Id))
                        {
                            Damage(p,t,d.Damage);
                            if(d.Empowered&&t.Alive){t.StunnedUntil=Math.Max(t.StunnedUntil,Now+1.5);t.PendingSecond=false;Interrupt(t);}
                        }
                    }
                    if(d.Contact&&nearest!=null)FinishDash(p,nearest);
                }
                p.Aim=d.Direction;Effect(p.Position,d.Direction,.25,.55,p.Team,"trail");
                if(p.Dash!=null&&d.Remaining<.001)FinishDash(p);
            }
            var q=p.Sequence;
            if(q!=null)
            {
                double[] times={0,.18,.4},damage={23,30,52};p.Aim=q.Direction;
                while(q.Index<3&&Now+1e-9>=q.Started+times[q.Index])
                {
                    int index=q.Index++;
                    foreach(var t in Targets())if(t.Id==q.Target&&Valid(p,t)&&ConeHitQuery.Contains(p.Position.Ground,t.Position.Ground,t.Radius,q.Direction.Ground,1.75,Math.PI*.6))Damage(p,t,damage[index]);
                    p.CastAt=Now;p.LastCast=AbilitySlot.Basic;p.CastAim=q.Direction;
                }
                if(q.Index>=3)p.Sequence=null;
            }
        }
        void AdvanceActions()
        {
            foreach(var a in Actions.ToArray())
            {
                if(a.Done)continue;
                if(!a.Owner.Alive||a.Owner.StunnedUntil>Now){a.Done=true;continue;}
                if(a.Type==0 && Now+1e-9>=a.At){Radial(a.Owner,a.Position,3,150);a.Done=true;}
                else if(a.Type==1)
                {
                    while(a.Index<5&&Now+1e-9>=a.At+a.Index*.085){Shot(a.Owner,a.Direction,5.2,16,.35,24,true);a.Index++;}
                    if(a.Index>=5)a.Done=true;
                }
                else if(a.Type==2)
                {
                    if(a.Until<=Now){a.Done=true;continue;}
                    foreach(var t in Targets())if(Valid(a.Owner,t)&&V2.Distance(a.Owner.Position,t.Position)<=3.8+t.Radius)t.Buffs["slow"]=new Modifier{Until=Now+.6,Slow=.35};
                }
            }
        }
        void ResetWeapons(MatchEntity p)
        {
            Projectiles.RemoveAll(s=>s.Owner==p&&s.Persistent);p.WeaponNext=0;p.OutgoingHits=0;p.Returning=false;p.PendingSecond=false;
            for(int i=0;i<2;i++)Projectiles.Add(new Projectile{Owner=p,Position=p.Position,Persistent=true,Phase=0,OrbitIndex=i,Piercing=true,Width=.4,Damage=38,Speed=13});
        }
        void WeaponCommand(MatchEntity p,V2 dir)
        {
            if(p.WeaponNext<2)
            {
                foreach(var s in Projectiles)if(s.Persistent&&s.Owner==p&&s.OrbitIndex==p.WeaponNext)
                {s.Phase=1;s.Position=p.Position;s.Direction=dir;s.Remaining=5.2;s.Speed=13;s.Damage=38;s.Hits.Clear();break;}
                p.WeaponNext++;
            }
            else
            {
                p.Returning=true;
                foreach(var s in Projectiles)if(s.Persistent&&s.Owner==p)
                {s.Phase=3;s.Speed=17;s.Damage=(50/1.5)*(1+Math.Min(p.OutgoingHits,6)*.25);s.Hits.Clear();}
            }
        }
        void AdvanceProjectiles(double dt)
        {
            foreach(var s in Projectiles.ToArray())
            {
                if(!s.Active)continue;
                var p=s.Owner;
                if(s.Persistent)
                {
                    if(!p.Alive){s.Active=false;continue;}
                    if(s.Phase==0){double angle=Now*2.2+s.OrbitIndex*Math.PI;s.Position=p.Position+new V2(Math.Cos(angle),Math.Sin(angle))*.85;continue;}
                    if(s.Phase==2)continue;
                    if(s.Phase==3){s.Direction=(p.Position-s.Position).Normal;s.Remaining=V2.Distance(p.Position,s.Position);}
                }
                V2 from=s.Position;double step=Math.Min(s.Remaining,s.Speed*dt);s.Position+=s.Direction*step;s.Remaining-=step;
                // Resolve nearest contact first for non-piercing shots, independent of actor-list order.
                var candidates=new System.Collections.Generic.List<MatchEntity>();
                foreach(var t in Targets())if(Valid(p,t,s.SummonersOnly)&&!s.Hits.Contains(t.Id)&&V2.Segment(t.Position,from,s.Position)<=s.Width+t.Radius)candidates.Add(t);
                candidates.Sort((a,b)=>V2.Distance(from,a.Position).CompareTo(V2.Distance(from,b.Position)));
                foreach(var t in candidates)
                {
                    if(!Valid(p,t,s.SummonersOnly))continue;
                    s.Hits.Add(t.Id);Damage(p,t,s.Damage,s.Lethal);
                    if(s.Persistent&&s.Phase==1)p.OutgoingHits++;
                    if(t.Kind==EntityKind.Summoner)s.Summoners.Add(t.Id);
                    if(s.Grant&&s.Summoners.Count>=2&&p.Alive){p.BlastUntil=Now+15;s.Grant=false;Log("Expellant Blast earned");}
                    if(!s.Piercing){s.Active=false;break;}
                }
                if(s.Remaining<.001)
                {
                    if(!s.Persistent)s.Active=false;
                    else if(s.Phase==3)
                    {
                        s.Phase=0;bool all=true;foreach(var other in Projectiles)if(other.Owner==p&&other.Persistent&&other.Phase!=0)all=false;
                        if(all){p.WeaponNext=p.OutgoingHits=0;p.Returning=false;}
                    }
                    else s.Phase=2;
                }
            }
        }
    }
}
