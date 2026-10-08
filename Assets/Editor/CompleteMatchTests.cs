using System;
using System.Linq;
using Crownfall.Combat;
using Crownfall.Match;

namespace Crownfall.Tests
{
    public static class CompleteMatchTests
    {
        static int checks;
        static void Check(bool v,string m){checks++;if(!v)throw new Exception("Complete match: "+m);}
        static void Near(double a,double b,string m,double e=1e-6){Check(Math.Abs(a-b)<e,m+" actual="+a+" expected="+b);}
        static MatchSimulation Isolated(FirstRosterSummoner r=FirstRosterSummoner.Kit)
        {
            var m=new MatchSimulation(r);foreach(var p in m.Actors)p.Bot=false;
            Advance(m,3.1);foreach(var p in m.Actors)p.Position=new V2(p.Team==1?-20:20,p.Slot*3);return m;
        }
        static void Advance(MatchSimulation m,double seconds){for(int i=0;i<(int)Math.Ceiling(seconds*60)&&m.Result==null;i++)m.Step(new MatchCommand());}
        static bool Cast(MatchSimulation m,MatchEntity p,AbilitySlot s,V2? direction=null,V2? offset=null,bool release=false)
        {return m.Cast(p,new CastCommand(s,direction??new V2(1,0),offset??new V2(),release));}
        public static int Run()
        {
            checks=0;
            foreach(FirstRosterSummoner selectedRoster in Enum.GetValues(typeof(FirstRosterSummoner)))
            {
                var m=new MatchSimulation(selectedRoster);Check(m.Actors.Count==6&&m.Actors.Count(p=>p.Bot)==5,"3v3/five bots");Check(m.Human.Roster==selectedRoster,"selected human");
                Near(m.BlueControl,.5,"neutral start");m.Step(new MatchCommand{Move=new V2(1,0)});Near(m.Human.Position.X,-30,"countdown inert");
            }
            var g=new AbilityGesture();g.Press(AbilitySlot.Basic,new V2(1,0),0,5.2);Check(g.Active,"press previews");
            CastCommand c;Check(g.Release(.1,out c)&&c.Direction.X==1,"quick release snapshot");Check(!g.Release(.2,out c),"no duplicate release");
            g.Press(AbilitySlot.Basic,new V2(1,0),1,5.2);g.Drag(new V2(0,70),5.2);Check(g.Release(1.4,out c)&&c.Direction.Z==1,"hold/drag confirmation");
            g.Press(AbilitySlot.Ultimate,new V2(1,0),2,14);g.Drag(new V2(151,0),14);Check(!g.Release(2.4,out c),"distance cancel");
            g.Press(AbilitySlot.Skill1,new V2(1,0),3,3);g.Cancel();Check(!g.Release(4,out c),"lost pointer never casts");
            var duel=Isolated();var kit=duel.Human;var enemy=duel.Actors[3];kit.Position=new V2(0,0);enemy.Position=new V2(2,0);
            double hp=enemy.Health.Current;Check(Cast(duel,kit,AbilitySlot.Basic),"basic accepted");Near(hp-enemy.Health.Current,85,"serialized basic budget");Check(!Cast(duel,kit,AbilitySlot.Basic),"cooldown");
            Check(!Cast(duel,kit,AbilitySlot.Ultimate),"meter gate");kit.UltimateMeter=100;Check(Cast(duel,kit,AbilitySlot.Ultimate),"ult accepted");Near(kit.UltimateMeter,0,"consume meter");kit.UltimateMeter=100;Check(!Cast(duel,kit,AbilitySlot.Ultimate),"ult cooldown gate");
            var lives=Isolated();var victim=lives.Human;var killer=lives.Actors[3];lives.Tickets[1]=1;
            lives.Damage(killer,victim,99999);Check(lives.Tickets[1]==0&&victim.Reserved&&victim.FinalAvailable,"last ticket preserves final");
            lives.Damage(killer,victim,99999);Check(victim.Deaths==1,"death transaction once");Advance(lives,3.1);Check(victim.Alive&&lives.Protected(victim),"protected respawn");
            Check(lives.Damage(killer,victim,99999)==0,"protection excludes incoming");Cast(lives,victim,AbilitySlot.Basic);Check(!lives.Protected(victim),"offensive breaks protection");
            lives.Damage(killer,victim,99999);Check(!victim.FinalAvailable&&victim.Reserved,"personal final reserve");Advance(lives,5.1);lives.Damage(killer,victim,99999);Check(victim.Eliminated&&!victim.Reserved,"permanent elimination");Check(lives.Result==null,"teammates viable");
            var elim=Isolated();elim.Tickets[2]=0;foreach(var p in elim.Actors.Where(p=>p.Team==2)){p.FinalAvailable=false;elim.Damage(elim.Human,p,99999);}elim.Step(new MatchCommand());Check(elim.Result.Winner==1&&elim.Result.Reason=="elimination","team elimination victory");
            double clock=elim.Now;elim.Step(new MatchCommand());Near(elim.Now,clock,"result freezes progression");
            var draw=Isolated();draw.Tickets[1]=draw.Tickets[2]=0;foreach(var p in draw.Actors){p.FinalAvailable=false;draw.Damage(draw.Actors[p.Team==1?3:0],p,99999);}draw.Step(new MatchCommand());Check(draw.Result.Winner==0,"simultaneous elimination draw");
            var territory=Isolated();foreach(var p in territory.Actors)p.Position=new V2(p.Team==1?4:8,0);Advance(territory,1);Near(territory.Front,6,"midpoint front");Near(territory.CP[1],0,"pressure grace");Advance(territory,1.5);Check(territory.CP[1]>0,"CP scoring");double cp=territory.CP[1];
            foreach(var p in territory.Actors)p.Position=new V2(p.Team==1?2:4,0);territory.Step(new MatchCommand());Check(territory.CP[1]>cp,"CP persists as front retreats");
            foreach(var p in territory.Actors)p.Position=new V2(p.Team==1?-2:2,0);territory.Step(new MatchCommand());Near(territory.Front,0,"neutral reset");Check(territory.ScoringTeam==0,"neutral stops scoring");
            foreach(var p in territory.Actors)p.Position=new V2(p.Team==1?33:1,0);territory.Step(new MatchCommand());Near(territory.Front,1,"crossing clamp");Check(territory.Result==null,"crossing no fake win");
            foreach(var p in territory.Actors.Where(p=>p.Team==2))p.Position=new V2(0,20);territory.Step(new MatchCommand());Check(territory.Result.Winner==1&&territory.Result.Reason=="total control","unopposed goal wins");
            var surge=Isolated();foreach(var p in surge.Actors)p.Position=new V2(p.Team==1?10:14,0);surge.Step(new MatchCommand());Check(surge.Surge.Active&&surge.Canals.Count==3,"70 percent activates canals");
            foreach(var p in surge.Actors)p.Position=new V2(p.Team==1?0:-10,20);double front=surge.Front;surge.Step(new MatchCommand());Check(surge.Front>front,"unattended advance");
            foreach(var p in surge.Actors.Where(p=>p.Team==2))p.Position=new V2(-10,0);front=surge.Front;surge.Step(new MatchCommand());Near(surge.Front,front,"defender-only hold");
            foreach(var canal in surge.Canals)surge.Damage(surge.Actors[3],canal,99999);Check(!surge.Surge.Active,"last canal ends surge");surge.Step(new MatchCommand());Check(surge.Front<0,"rubber band restored");Check(!surge.Surge.TryTrigger(1,80),"one-time surge");
            var regen=Isolated();var a=regen.Human;regen.Damage(regen.Actors[3],a,100);double damaged=a.Health.Current;Advance(regen,4.4);Near(a.Health.Current,damaged,"regen delay");Advance(regen,.3);Check(a.Health.Current>damaged,"percentage regeneration");
            var wild=Isolated();var camp=wild.Camps[0];double meter=wild.Human.UltimateMeter;wild.Damage(wild.Human,camp,99999);Check(!camp.Alive&&wild.Rewards==1,"camp reward once");Near(wild.Human.Factor(wild.Now,2),1.2,"mobility buff");Near(wild.Human.UltimateMeter,meter,"no camp ult meter");wild.Damage(wild.Human,camp,99999);Check(wild.Rewards==1,"no double reward");Advance(wild,20.1);Near(wild.Human.Factor(wild.Now,2),1,"buff expiry");Advance(wild,25);Check(camp.Alive&&camp.Health.Current==850,"camp respawn");
            var cd=Isolated(FirstRosterSummoner.Riven);cd.Damage(cd.Human,cd.Camps[2],99999);Cast(cd,cd.Human,AbilitySlot.Skill1);Near(cd.Human.ReadyAt[1]-cd.Now,4.4,"normal cooldown reduced");Cast(cd,cd.Human,AbilitySlot.Special);Near(cd.Human.ReadyAt[4]-cd.Now,3,"stance unmodified");Check(!Cast(cd,cd.Human,AbilitySlot.Skill1),"shared skill channel");
            var boss=Isolated();boss.Damage(boss.Human,boss.Camps[6],99999);foreach(var p in boss.Actors)Near(p.Factor(boss.Now,0),p.Team==1?1.25:1,"team major damage");boss.Damage(boss.Actors[3],boss.Human,99999);Advance(boss,3.1);Near(boss.Human.Factor(boss.Now,0),1.25,"major refresh on respawn");
            var set=Isolated(FirstRosterSummoner.Set);var s=set.Human;s.Position=new V2(0,0);foreach(var p in set.Actors.Skip(1))p.Position=new V2(p.Team==1?-15:15,0);Cast(set,s,AbilitySlot.Skill2);Advance(set,.3);Near(s.Position.X,3.6,"leap exact distance");Check(s.Sequence==null&&s.ReadyAt[2]>set.Now,"miss no follow strikes and full cooldown");
            var fist=Isolated(FirstRosterSummoner.Set);s=fist.Human;s.Position=new V2(0,0);fist.Actors[3].Position=new V2(14,0);s.UltimateMeter=100;Cast(fist,s,AbilitySlot.Ultimate,new V2(1,0),new V2(99,0));Near(fist.Actions[0].Position.X,14,"ground clamp");hp=fist.Actors[3].Health.Current;s.Position=new V2(-10,0);Advance(fist,.6);Near(fist.Actors[3].Health.Current,hp,"delayed impact");Advance(fist,.15);Near(hp-fist.Actors[3].Health.Current,150,"committed world impact");
            var riven=Isolated(FirstRosterSummoner.Riven);var r=riven.Human;r.Position=new V2(0,0);riven.Actors[3].Position=new V2(3,0);hp=riven.Actors[3].Health.Current;Cast(riven,r,AbilitySlot.Basic,new V2(1,0),null,true);Check(r.WeaponNext==1&&r.PendingSecond,"first launch schedules follow-up");Advance(riven,2);Check(r.WeaponNext==2&&!r.PendingSecond,"second at cadence");Check(riven.Projectiles.Where(x=>x.Persistent&&x.Owner==r).All(x=>x.Phase==2),"persistent parked blades");Check(r.OutgoingHits>=2,"outgoing hits tracked");Check(Cast(riven,r,AbilitySlot.Basic),"recall accepted at shared cadence");Advance(riven,.5);Check(r.WeaponNext==0&&!r.Returning,"recall restores orbit");Check(riven.Actors[3].Health.Current<hp-76,"recall damages separately");
            Cast(riven,r,AbilitySlot.Special);Check(r.Pulse,"pulse switch");Check(!Cast(riven,r,AbilitySlot.Basic),"basic shared across switch");
            var grant=Isolated();grant.Human.Position=new V2(0,0);grant.Actors[3].Position=new V2(3,0);grant.Actors[4].Position=new V2(6,0);grant.Human.UltimateMeter=100;Cast(grant,grant.Human,AbilitySlot.Ultimate);Advance(grant,.5);Check(grant.Human.BlastUntil>grant.Now,"two unique summoners grant blast");grant.Actors[3].Buffs["defense"]=new Modifier{Until=999,Mitigation=.99};Cast(grant,grant.Human,AbilitySlot.Special);Advance(grant,.2);Check(!grant.Actors[3].Alive,"lethal bypasses mitigation");Near(grant.Human.BlastUntil,0,"grant consumed");
            Check(MatchMap.Blocked(new V2(12,18),.4),"authored obstacle");var moved=MatchMap.Move(new V2(8,18),new V2(20,0),.4);Check(moved.X<10,"substep collision prevents tunnel");
            int rotations=0,rewards=0,deaths=0,majorAttempts=0;
            foreach(FirstRosterSummoner roster in Enum.GetValues(typeof(FirstRosterSummoner)))
            {
                var match=new MatchSimulation(roster);match.Human.Bot=true;bool deadSeen=false,respawnSeen=false;
                for(int i=0;i<60*305&&match.Result==null;i++)
                {
                    match.Step(null);
                    foreach(var p in match.Actors){Check(HealthState.Finite(p.Position.X)&&HealthState.Finite(p.Position.Z)&&HealthState.Finite(p.Health.Current),"finite full match");if(!p.Alive)deadSeen=true;if(deadSeen&&p.Alive&&p.Deaths>0)respawnSeen=true;}
                    if(match.Actors.Any(p=>p.AssignedCamp==107))majorAttempts++;
                }
                Check(match.Result!=null,"complete match concludes: "+roster);Check(match.Actors.Any(p=>p.DamageDealt>0),"real combat: "+roster);
                Check(deadSeen&&respawnSeen,"death/respawn exercised: "+roster);rotations+=match.Rotations;rewards+=match.Rewards;deaths+=match.Actors.Sum(p=>p.Deaths);
                Console.WriteLine(roster+" match: winner="+match.Result.Winner+", reason="+match.Result.Reason+", seconds="+match.Now.ToString("F2")+", deaths="+match.Actors.Sum(p=>p.Deaths)+", rotations="+match.Rotations+", rewards="+match.Rewards);
            }
            Check(rotations>0&&rewards>0&&majorAttempts>0&&deaths>0,"bots contest wilderness and fight");
            Console.WriteLine("Full match totals: rotations="+rotations+", rewards="+rewards+", deaths="+deaths+", major-attempt ticks="+majorAttempts);
            return checks;
        }
    }
}
