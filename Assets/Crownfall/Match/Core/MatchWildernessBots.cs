using System;
using System.Collections.Generic;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed partial class MatchSimulation
    {
        void RewardCamp(MatchEntity camp,MatchEntity source)
        {
            camp.RespawnAt=Now+(camp.CampType=="damage"?100:45);
            if(source.Kind!=EntityKind.Summoner)return;
            Rewards++;Log(source.Name+" secured "+camp.Name);
            if(camp.CampType=="damage")
            {
                teamDamageUntil[source.Team]=Now+25;
                foreach(var p in Actors)if(p.Team==source.Team&&p.Alive)p.Buffs["damage"]=new Modifier{Until=Now+25,Damage=.25};
            }
            else if(source.Alive)
            {
                var m=new Modifier{Until=Now+20};
                if(camp.CampType=="mobility")m.Speed=.2;
                else if(camp.CampType=="cooldown")m.Cooldown=.2;
                else m.Mitigation=.2;
                source.Buffs[camp.CampType]=m;
            }
        }
        void AdvanceCamps(double dt)
        {
            foreach(var c in Camps)
            {
                c.Previous=c.Position;
                if(!c.Alive)
                {
                    if(Now>=c.RespawnAt){c.Health=new HealthState(c.Id,0,c.CampType=="damage"?5200:850);c.Position=c.Spawn;c.LastHit=double.NegativeInfinity;c.ReadyAt[0]=Now+1;c.Buffs.Clear();c.StunnedUntil=0;}
                    continue;
                }
                if(c.StunnedUntil>Now)continue;
                MatchEntity target=null;double best=9;
                foreach(var p in Actors)if(p.Alive&&!Protected(p)&&V2.Distance(p.Position,c.Spawn)<=12)
                {double d=V2.Distance(c.Position,p.Position);if(d<=best){best=d;target=p;}}
                if(target==null)
                {
                    if(Now-c.LastHit>2){c.Health.Restore(c.Health.Maximum);c.Position=c.Spawn;}
                    continue;
                }
                double reach=c.CampType=="damage"?3.2:2.3;
                c.Aim=(target.Position-c.Position).Normal;
                if(best>reach)c.Position=MatchMap.Move(c.Position,c.Aim*Math.Min(best-reach,3.8*c.Factor(Now,2)*dt),c.Radius);
                else if(c.ReadyAt[0]<=Now){Damage(c,target,c.CampType=="damage"?110:42);c.ReadyAt[0]=Now+1;}
            }
        }
        MatchEntity Assigned(MatchEntity p)
        {
            if(p.AssignmentUntil<=Now)return null;
            foreach(var c in Camps)if(c.Id==p.AssignedCamp&&c.Alive)return c;
            return null;
        }
        void Assign(MatchEntity p,MatchEntity c,double seconds){p.AssignedCamp=c.Id;p.AssignmentUntil=Now+seconds;Rotations++;}
        void CoordinateCamps()
        {
            foreach(var p in Actors)if(!p.Alive||Assigned(p)==null)p.AssignedCamp=0;
            for(int team=1;team<=2;team++)
            {
                double control=team==1?BlueControl:1-BlueControl;
                var alive=new List<MatchEntity>();var bots=new List<MatchEntity>();int lane=0;bool busy=false;
                foreach(var p in Actors)if(p.Team==team&&p.Alive)
                {
                    alive.Add(p);if(p.AssignedCamp!=0)busy=true;
                    if(p.AssignedCamp==0&&Math.Abs(p.Position.Z)<=12)lane++;
                    if(p.Bot&&p.AssignedCamp==0&&p.Health.Current/p.Health.Maximum>.55)bots.Add(p);
                }
                if(alive.Count<3||control<.35){foreach(var p in alive)p.AssignedCamp=0;continue;}
                if(busy)continue;
                var major=Camps[6];
                if(major.Alive&&Now>=nextMajor[team]&&control>=.45&&lane>=3&&bots.Count>=2)
                {Assign(bots[0],major,36);Assign(bots[1],major,36);nextMajor[team]=Now+50;continue;}
                if(Now>=nextRotation[team]&&lane>=2&&bots.Count>0)
                {
                    MatchEntity chosenBot=null,chosenCamp=null;double best=double.PositiveInfinity;
                    foreach(var p in bots)foreach(var c in Camps)if(c.Alive&&c.CampType!="damage"&&!p.Buffs.ContainsKey(c.CampType))
                    {
                        double d=V2.Distance(p.Position,c.Position);if(d<best){best=d;chosenBot=p;chosenCamp=c;}
                    }
                    if(chosenBot!=null)Assign(chosenBot,chosenCamp,24);
                    nextRotation[team]=Now+24;
                }
            }
        }
        public MatchCommand BotRead(MatchEntity p)
        {
            if(!p.Alive)return new MatchCommand();
            if(Now<p.ThinkAt)
            {
                var old=p.BotCommand;
                return new MatchCommand{Move=old.Move,Aim=old.Aim,Aiming=old.Aiming,BasicHeld=old.BasicHeld};
            }
            p.ThinkAt=Now+.15;int sign=p.Team==1?1:-1;
            MatchEntity nearby=null;double nearDistance=15;
            foreach(var t in Actors)if(t.Team!=p.Team&&t.Alive&&Math.Abs(t.Position.Z)<15)
            {double d=V2.Distance(p.Position,t.Position);if(d<nearDistance){nearby=t;nearDistance=d;}}
            var objective=Assigned(p);var enemy=objective!=null&&(nearby==null||nearDistance>5)?objective:nearby;
            // Defenders must actually attack the non-offensive Canals to end Surge's hold.
            if(objective==null&&Surge.Active&&Surge.ActiveTeam!=p.Team&&(nearby==null||nearDistance>6))
            {
                double best=double.PositiveInfinity;foreach(var c in Canals)if(c.Alive)
                {double d=V2.Distance(p.Position,c.Position);if(d<best){best=d;enemy=c;}}
            }
            double distance=enemy==null?double.PositiveInfinity:V2.Distance(p.Position,enemy.Position);
            double health=p.Health.Current/p.Health.Maximum;
            if(health<.25&&distance<8&&Now>=p.NextRetreat){p.RetreatUntil=Now+2;p.NextRetreat=Now+7;}
            bool retreat=Now<p.RetreatUntil&&p.Position.X*sign>-18;
            // Stay out while recovering instead of returning from a retreat at critical health.
            if(health<.55&&p.BotState=="retreat"&&Now-p.LastHit<CombatEconomy.OutOfCombatDelay+4)retreat=true;
            V2 target=new V2(sign*28,new double[]{0,-8,8}[p.Slot]),direction=p.Aim;
            double range=FirstRosterBalance.Get(p.Roster).BasicRange;
            var command=new MatchCommand();
            if(enemy!=null)
            {
                direction=(enemy.Position-p.Position).Normal;
                double error=Math.Sin(Now*2+p.Id)*.055;
                direction=new V2(direction.X*Math.Cos(error)-direction.Z*Math.Sin(error),direction.X*Math.Sin(error)+direction.Z*Math.Cos(error));
                command.Aim=direction;command.Aiming=true;
                p.BotState=retreat?"retreat":enemy==objective?"wilderness":distance>range?"engage":"pressure";
                if(retreat)target=p.Position+new V2(-sign*4, new double[]{0,-8,8}[p.Slot]-p.Position.Z);
                else if(distance>range*.9)target=enemy.Position-direction*range*.8;
                else if(p.Roster==FirstRosterSummoner.Riven&&distance<3&&enemy.Kind==EntityKind.Summoner)target=p.Position-direction*2;
                else target=p.Position;
                command.BasicHeld=!retreat&&distance<range+1;
                Action<AbilitySlot> cast=slot=>command.Casts.Add(new CastCommand(slot,direction,enemy.Position-p.Position));
                if(!retreat)
                {
                    if(p.Roster==FirstRosterSummoner.Kit)
                    {
                        if(distance<4.2)cast(AbilitySlot.Skill2);
                        if(distance>range&&distance<6.2)cast(AbilitySlot.Skill1);
                        if(distance<20&&enemy.Kind==EntityKind.Summoner){cast(AbilitySlot.Ultimate);cast(AbilitySlot.Special);}
                    }
                    else if(p.Roster==FirstRosterSummoner.Set)
                    {
                        if(distance<7)cast(AbilitySlot.Skill1);
                        if(distance>2&&distance<5.6)cast(AbilitySlot.Skill2);
                        if(distance<14)cast(AbilitySlot.Ultimate);
                    }
                    else
                    {
                        if(distance<7)cast(AbilitySlot.Skill2);
                        if(distance<6&&enemy.Kind==EntityKind.Summoner)cast(AbilitySlot.Ultimate);
                        if(distance<(p.Pulse?3.8:6))cast(AbilitySlot.Skill1);
                        if(Now>=p.NextStance&&((distance<3.5&&!p.Pulse)||(distance>4.5&&p.Pulse)))
                        {cast(AbilitySlot.Special);p.NextStance=Now+7;}
                    }
                }
            }
            else p.BotState="advance";
            V2 move=target-p.Position;
            if(move.Length>.15)
            {
                move=move.Normal;
                if(MatchMap.Blocked(p.Position+move*.65,p.Radius))
                {
                    bool found=false;foreach(double delta in new double[]{.6,-.6,1.2,-1.2,1.57,-1.57})
                    {
                        V2 probe=new V2(move.X*Math.Cos(delta)-move.Z*Math.Sin(delta),move.X*Math.Sin(delta)+move.Z*Math.Cos(delta));
                        if(!MatchMap.Blocked(p.Position+probe*.65,p.Radius)){move=probe;found=true;break;}
                    }
                    if(!found)move=new V2();
                }
            }
            else move=new V2();
            command.Move=move;p.BotCommand=command;return command;
        }
    }
}
