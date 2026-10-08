using System;
using System.Collections.Generic;
using Crownfall.Combat;

namespace Crownfall.Match
{
    // One local fixed-step authority. Scene, sprite, input and physics APIs do not decide hits.
    public sealed partial class MatchSimulation
    {
        public const double StepSeconds=1.0/60, Regulation=300, CPGoal=1000;
        public readonly List<MatchEntity> Actors = new List<MatchEntity>();
        public readonly List<MatchEntity> Camps = new List<MatchEntity>();
        public readonly List<MatchEntity> Canals = new List<MatchEntity>();
        public readonly List<Projectile> Projectiles = new List<Projectile>();
        public readonly List<TimedAction> Actions = new List<TimedAction>();
        public readonly List<MatchEffect> Effects = new List<MatchEffect>();
        public readonly PresentationJournal Presentation = new PresentationJournal();
        long presentationAction;
        void Present(MatchEntity actor,PresentationPhase phase,int target=0,int detail=0,long actionId=-1,AbilitySlot? ability=null,V2? position=null)
        {Presentation.Publish(new PresentationEvent{ActionId=actionId>=0?actionId:actor==null?presentationAction:actor.PresentationActionId,ActorId=actor==null?0:actor.Id,TargetId=target,Ability=ability??(actor==null?AbilitySlot.Basic:actor.LastCast),Phase=phase,Detail=detail,Position=position??(actor==null?new V2():actor.Position),Direction=actor==null?new V2():actor.CastAim,Time=Now});}
        public readonly List<string> Feed = new List<string>();
        public readonly int[] Tickets = {0,15,15};
        public readonly double[] CP = new double[3];
        public readonly TerritorySurgeState Surge = new TerritorySurgeState();
        readonly double[] teamDamageUntil = new double[3];
        readonly double[] nextRotation = {0,14,20}, nextMajor = {0,48,55};
        readonly BasicAttackSpec kitBasic;
        public MatchPhase Phase { get; private set; } = MatchPhase.Countdown;
        public double Countdown { get; private set; } = 3;
        public double Now { get; private set; }
        public double Front { get; private set; }
        public double BlueControl => (Front+MatchMap.Goal)/(2*MatchMap.Goal);
        public int PressureTeam { get; private set; }
        public int ScoringTeam { get; private set; }
        public double PressureAge { get; private set; }
        public MatchResult Result { get; private set; }
        public int Tick { get; private set; }
        public int Rotations { get; private set; }
        public int Rewards { get; private set; }
        public MatchEntity Human => Actors[0];
        public bool Active => Phase==MatchPhase.Active && Result==null;
        public MatchSimulation(FirstRosterSummoner selected, BasicAttackSpec serializedKitBasic = null)
        {
            kitBasic=serializedKitBasic ?? new BasicAttackSpec(2.6,Math.PI*.65,.85,1.25,new double[]{85,105},new double[]{0});
            var blue = new List<FirstRosterSummoner>{selected};
            foreach(FirstRosterSummoner r in Enum.GetValues(typeof(FirstRosterSummoner))) if(r!=selected) blue.Add(r);
            double[] offsets={0,-8,8};
            for(int team=1;team<=2;team++) for(int slot=0;slot<3;slot++)
            {
                var roster=team==1?blue[slot]:(FirstRosterSummoner)slot;
                var profile=FirstRosterBalance.Get(roster);
                var p = new MatchEntity {Id=Actors.Count+1,Team=team,Slot=slot,Kind=EntityKind.Summoner,Roster=roster,
                    Name=roster==FirstRosterSummoner.Kit?"Kit Asher":roster.ToString(),Bot=team!=1||slot!=0,
                    Spawn=new V2(team==1?-30:30,offsets[slot]),Aim=new V2(team==1?1:-1,0),Radius=FirstRosterBalance.StandardRadius};
                p.Position=p.Previous=p.Spawn; p.Health=new HealthState(p.Id,team,profile.MaximumHealth); Actors.Add(p);
                if(roster==FirstRosterSummoner.Riven) ResetWeapons(p);
            }
            AddCamp("Mobility West","mobility",-22,-22); AddCamp("Mobility East","mobility",22,-22);
            AddCamp("Cooldown West","cooldown",-18,24); AddCamp("Cooldown East","cooldown",18,24);
            AddCamp("Defense West","defense",-7,-27); AddCamp("Defense East","defense",7,-27);
            AddCamp("Major Damage","damage",0,26);
        }
        void AddCamp(string name,string type,double x,double z)
        {
            var c=new MatchEntity{Id=101+Camps.Count,Name=name,CampType=type,Kind=EntityKind.Camp,Radius=type=="damage"?1.3:.7,Spawn=new V2(x,z)};
            c.Position=c.Previous=c.Spawn;c.Health=new HealthState(c.Id,0,type=="damage"?5200:850);Camps.Add(c);
        }
        public IEnumerable<MatchEntity> Targets()
        {
            foreach(var p in Actors) yield return p;
            foreach(var c in Camps) yield return c;
            foreach(var c in Canals) yield return c;
        }
        public bool Protected(MatchEntity p) => p.Kind==EntityKind.Summoner && p.ProtectedUntil>Now;
        bool Valid(MatchEntity owner,MatchEntity t,bool summonersOnly=false) => t.Alive && t.Id!=owner.Id && t.Team!=owner.Team && !Protected(t) && (!summonersOnly||t.Kind==EntityKind.Summoner);
        void Log(string message) {Feed.Insert(0,message);if(Feed.Count>3)Feed.RemoveAt(3);}
        public void Step(MatchCommand human, double dt=StepSeconds)
        {
            if(!HealthState.Finite(dt)||dt<=0||dt>.1) throw new ArgumentOutOfRangeException(nameof(dt));
            if(Result!=null) return;
            if(Phase==MatchPhase.Countdown)
            {
                Countdown=Math.Max(0,Countdown-dt);
                if(Countdown<1e-9){Countdown=0;Phase=MatchPhase.Active;}
                return;
            }
            dt=Math.Min(dt,Regulation-Now); Now+=dt; Tick++;
            foreach(var p in Actors)
            {
                p.Previous=p.Position;
                if(!p.Alive && p.Reserved && Now+1e-9>=p.RespawnAt) Respawn(p);
                var expired=new List<string>();foreach(var kv in p.Buffs)if(kv.Value.Until<=Now)expired.Add(kv.Key);
                foreach(var key in expired)p.Buffs.Remove(key);
                if(p.Alive && teamDamageUntil[p.Team]>Now)p.Buffs["damage"]=new Modifier{Until=teamDamageUntil[p.Team],Damage=.25};
                if(!p.Alive||p.StunnedUntil>Now){p.PendingSecond=false;Interrupt(p);}
            }
            CoordinateCamps();
            var commands=new MatchCommand[6];
            for(int i=0;i<6;i++) commands[i]=Actors[i].Bot?BotRead(Actors[i]):human??new MatchCommand();
            for(int k=0;k<6;k++)
            {
                int i=Tick%2==1?k:5-k;var p=Actors[i];var cmd=commands[i];
                if(!p.Alive||p.StunnedUntil>Now)continue;
                if(!p.Locked)
                {
                    var move=cmd.Move; if(move.Length>1)move=move.Normal;
                    double speed=FirstRosterBalance.Get(p.Roster).MoveSpeed*p.Factor(Now,2);
                    if(p.Roster==FirstRosterSummoner.Kit && Math.Abs(p.Position.Z)>12)speed*=1.05;
                    p.Position=MatchMap.Move(p.Position,move*speed*dt,p.Radius);
                    if(cmd.Aiming && cmd.Aim.Length>.001)p.Aim=cmd.Aim.Normal;
                    else if(move.Length>.01)p.Aim=move.Normal;
                }
                foreach(var c in cmd.Casts)Cast(p,c);
                if(cmd.BasicHeld && p.Roster!=FirstRosterSummoner.Riven)Cast(p,new CastCommand(AbilitySlot.Basic,p.Aim));
                // Bots issue direct Riven commands, whereas human release schedules the second blade.
                if(cmd.BasicHeld && p.Roster==FirstRosterSummoner.Riven)Cast(p,new CastCommand(AbilitySlot.Basic,p.Aim));
                if(p.PendingSecond && Now+1e-9>=p.PendingSecondAt)
                {
                    if(Cast(p,new CastCommand(AbilitySlot.Basic,p.PendingDirection)))p.PendingSecond=false;
                }
                AdvanceMotion(p,dt);
            }
            AdvanceActions(); AdvanceProjectiles(dt); AdvanceCamps(dt);
            foreach(var p in Actors)if(p.Alive)p.Health.Restore(p.Recovery.RegenerationAmount(Now,dt,p.Health.Maximum));
            MeasureTerritory(dt); ResolveResult(dt);
            foreach(var p in Actors)if(p.Alive&&p.Team==ScoringTeam&&Math.Abs(p.Position.Z)<=12)p.PressureSeconds+=dt;
            Effects.RemoveAll(e=>e.Until<=Now);
            Projectiles.RemoveAll(e=>!e.Active);Actions.RemoveAll(e=>e.Done);
        }
        void Respawn(MatchEntity p)
        {
            p.Health=new HealthState(p.Id,p.Team,FirstRosterBalance.Get(p.Roster).MaximumHealth);
            p.Position=p.Previous=p.Spawn;p.Aim=new V2(p.Team==1?1:-1,0);p.Reserved=false;
            p.ProtectedUntil=Now+2;p.Pulse=false;p.StunnedUntil=0;p.ComboAt=double.NegativeInfinity;
            p.Recovery=new CombatRecoveryState();
            Present(p,PresentationPhase.Respawn);
            if(p.Roster==FirstRosterSummoner.Riven)ResetWeapons(p);
        }
        public double Damage(MatchEntity source,MatchEntity target,double amount,bool lethal=false,long presentationActionId=-1,AbilitySlot? presentationAbility=null)
        {
            if(!Active||!HealthState.Finite(amount)||amount<0||!Valid(source,target))return 0;
            double adjusted=lethal?target.Health.Current:amount*source.Factor(Now,0)*target.Factor(Now,1)*AuraFactor(target);
            var hit=target.Health.Receive(new DamageRequest(source.Id,source.Team,Tick,0,adjusted));
            if(hit.Applied<=0)return 0;
            target.LastHit=Now;
            Present(source,PresentationPhase.Hit,target.Id,0,presentationActionId,presentationAbility,target.Position);
            if(source.Kind==EntityKind.Summoner){if(target.Kind==EntityKind.Summoner)source.DamageDealt+=hit.Applied;source.Recovery.MarkDamagingInteraction(Now);}
            if(target.Kind==EntityKind.Summoner)
            {
                target.Recovery.MarkDamagingInteraction(Now);
                if(source.Kind==EntityKind.Summoner)
                {
                    source.UltimateMeter=Math.Min(100,source.UltimateMeter+hit.Applied*.04);
                    target.UltimateMeter=Math.Min(100,target.UltimateMeter+hit.Applied*.025);
                    target.Contributors[source.Id]=Now;
                }
            }
            Effect(target.Position,source.Aim,.4,target.Radius,source.Team,"hit");
            if(hit.Defeated)
            {
                if(target.Kind==EntityKind.Summoner)Defeat(target,source);
                else if(target.Kind==EntityKind.Camp)RewardCamp(target,source);
                else {Surge.DestroyCanal();Log("Aether Canal destroyed");Present(target,PresentationPhase.Objective,source.Id);}
            }
            return hit.Applied;
        }
        double AuraFactor(MatchEntity target)
        {
            if(target.Kind!=EntityKind.Summoner)return 1;
            double factor=1;
            foreach(var set in Actors)
            {
                if(!set.Alive||set.Roster!=FirstRosterSummoner.Set||set.Team!=target.Team)continue;
                bool active=false;foreach(var ally in Actors)if(ally!=set&&ally.Alive&&ally.Team==set.Team&&V2.Distance(ally.Position,set.Position)<=5){active=true;break;}
                if(active && V2.Distance(target.Position,set.Position)<=5)factor*=.98;
            }
            return factor;
        }
        void Defeat(MatchEntity p,MatchEntity source)
        {
            Present(p,PresentationPhase.Death,source.Id);
            p.Deaths++;if(source.Kind==EntityKind.Summoner)source.Kills++;
            foreach(var kv in p.Contributors)if(kv.Key!=source.Id&&Now-kv.Value<=8)foreach(var ally in Actors)if(ally.Id==kv.Key)ally.Assists++;
            p.Contributors.Clear();
            p.Reserved=false;
            if(Tickets[p.Team]>0){Tickets[p.Team]--;p.Reserved=true;}
            else if(p.FinalAvailable){p.FinalAvailable=false;p.Reserved=true;}
            p.Eliminated=!p.Reserved;p.RespawnAt=p.Reserved?Now+3:double.PositiveInfinity;
            p.Buffs.Clear();p.BlastUntil=0;p.Streak=0;p.PendingSecond=false;p.AssignedCamp=0;
            Interrupt(p);
            foreach(var shot in Projectiles)if(shot.Owner==p&&shot.Persistent)shot.Active=false;
            Projectiles.RemoveAll(s=>s.Owner==p&&s.Persistent);Actions.RemoveAll(a=>a.Owner==p);
            p.WeaponNext=p.OutgoingHits=0;p.Returning=false;
            Log(source.Name+" defeated "+p.Name);
        }
        void Interrupt(MatchEntity p)
        {
            if(p.Dash!=null && p.Dash.Contact)p.ReadyAt[2]=Now+8.5*p.Factor(Now,3);
            if(p.Dash!=null&&!p.Dash.Contact)p.Streak=0;
            p.Dash=null;p.Sequence=null;
            foreach(var a in Actions)if(a.Owner==p)a.Done=true;
        }
        void MeasureTerritory(double dt)
        {
            double? b=null,r=null;int blue=0,red=0;
            foreach(var p in Actors)if(p.Alive&&!p.Reserved&&Math.Abs(p.Position.Z)<=12)
            {if(p.Team==1){blue++;b=b.HasValue?Math.Max(b.Value,p.Position.X):p.Position.X;}else{red++;r=r.HasValue?Math.Min(r.Value,p.Position.X):p.Position.X;}}
            var mode=Surge.ResolveLaneMode(Surge.ActiveTeam==1?blue:red,Surge.ActiveTeam==1?red:blue);
            if(mode==SurgeLaneMode.AutonomousAdvance)Front+=dt*.35*(Surge.ActiveTeam==1?1:-1);
            else if(mode!=SurgeLaneMode.HoldEarnedControl)
            {
                if(b.HasValue&&r.HasValue)Front=b<=r?(b.Value+r.Value)/2:Math.Max(r.Value,Math.Min(b.Value,Front));
                else Front=b.HasValue?Math.Max(0,b.Value):r.HasValue?Math.Min(0,r.Value):0;
            }
            Front=Math.Max(-28,Math.Min(28,Front));
            if(b.HasValue&&r.HasValue)Front=Math.Max(-27.944,Math.Min(27.944,Front));
            if(Math.Abs(Front)<1e-8)Front=0;
            if(!Surge.Active)
            {
                if(Surge.TryTrigger(1,BlueControl*100))SpawnCanals(1);
                else if(Surge.TryTrigger(2,(1-BlueControl)*100))SpawnCanals(2);
            }
        }
        void SpawnCanals(int team)
        {
            Present(null,PresentationPhase.Surge,0,team);
            Canals.Clear();
            for(int i=0;i<3;i++)
            {
                var p=new MatchEntity{Id=201+i,Team=team,Kind=EntityKind.Canal,Name="Aether Canal",Radius=.7,
                    Position=new V2(Front-(team==1?3:-3),(i-1)*7)};
                p.Health=new HealthState(p.Id,team,300);Canals.Add(p);
            }
            Log((team==1?"Blue":"Red")+" Surge — destroy all three Canals to end it");
        }
        bool Viable(int team){foreach(var p in Actors)if(p.Team==team&&(p.Alive||p.Reserved))return true;return false;}
        void Finish(int winner,string reason){Result=new MatchResult{Winner=winner,Reason=reason,Duration=Now};Phase=MatchPhase.Results;Present(null,PresentationPhase.Result,0,winner);}
        void ResolveResult(double dt)
        {
            if(Front>=28){Finish(1,"total control");return;}if(Front<=-28){Finish(2,"total control");return;}
            bool blue=Viable(1),red=Viable(2);if(!blue||!red){Finish(blue?1:red?2:0,"elimination");return;}
            int team=Front>0?1:Front<0?2:0;
            if(team!=PressureTeam){PressureTeam=team;PressureAge=0;}ScoringTeam=0;
            if(team!=0)
            {
                double previous=PressureAge;PressureAge+=dt;
                double scoring=Math.Max(0,PressureAge-2)-Math.Max(0,previous-2);
                CP[team]=Math.Min(CPGoal,CP[team]+scoring*12);if(PressureAge>=2)ScoringTeam=team;
                if(CP[team]>=CPGoal){Finish(team,"Crownfall points");return;}
            }
            else PressureAge=0;
            if(Now>=Regulation-1e-8)Finish(Math.Abs(CP[1]-CP[2])>1e-8?(CP[1]>CP[2]?1:2):Front!=0?(Front>0?1:2):0,"regulation");
        }
        void Effect(V2 pos,V2 dir,double duration,double radius,int team,string kind)
        {Effects.Add(new MatchEffect{Position=pos,Direction=dir,Until=Now+duration,Radius=radius,Team=team,Kind=kind});}
    }
}
