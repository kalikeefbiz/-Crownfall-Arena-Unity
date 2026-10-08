using System;
using System.Collections.Generic;
using Crownfall.Match;
using Crownfall.Combat;
namespace Crownfall.Tests
{
    public static class ProductionPresentationTests
    {
        static int checks;
        static void Check(bool good,string what){checks++;if(!good)throw new Exception("Presentation: "+what);}
        public static int Run()
        {
            checks=0;
            var journal=new PresentationJournal();
            for(int i=0;i<2000;i++)journal.Publish(new PresentationEvent{Time=i});
            long cursor=0,second=0,last=0;PresentationEvent ev;int count=0;
            while(journal.Read(ref cursor,out ev)){Check(ev.Sequence>last,"strict order after overflow");last=ev.Sequence;count++;}
            Check(count==256&&cursor==2000,"bounded backlog");Check(!journal.Read(ref cursor,out ev),"no duplicate read");
            count=0;while(journal.Read(ref second,out ev))count++;Check(count==256,"independent consumer");
            for(int rematch=0;rematch<40;rematch++)
            {
                var pool=new PresentationSlots(128);var taken=new HashSet<int>();
                for(int i=0;i<128;i++)Check(taken.Add(pool.Acquire()),"unique bounded visual slot");
                Check(pool.Acquire()==-1&&pool.Count==128,"pool cap");pool.Release(30);pool.Release(30);Check(pool.Count==127,"idempotent release");Check(pool.Acquire()==30,"reuse released slot");pool.Reset();Check(pool.Count==0&&pool.Acquire()==0,"rematch reset");
                var match=new MatchSimulation((FirstRosterSummoner)(rematch%3));foreach(var p in match.Actors)p.Bot=false;
                Check(match.Presentation.LastSequence==0,"fresh event identity");for(int i=0;i<190;i++)match.Step(new MatchCommand());
                Check(match.Cast(match.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0))),"accepted cast");
                Check(!match.Cast(match.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0))),"rejected cast");
                cursor=0;count=0;while(match.Presentation.Read(ref cursor,out ev))if(ev.Phase==PresentationPhase.Cast){count++;Check(ev.ActorId==match.Human.Id&&ev.ActionId>0,"typed action identity");}
                Check(count==1,"no duplicate rejected cast event");
            }
            var hitMatch=new MatchSimulation(FirstRosterSummoner.Kit);foreach(var p in hitMatch.Actors)p.Bot=false;for(int i=0;i<190;i++)hitMatch.Step(null);
            hitMatch.Human.Position=new V2(0,0);hitMatch.Actors[3].Position=new V2(2,0);hitMatch.Cast(hitMatch.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0)));cursor=0;
            while(hitMatch.Presentation.Read(ref cursor,out ev))if(ev.Phase==PresentationPhase.Hit){Check(ev.Position.X==2&&ev.TargetId==hitMatch.Actors[3].Id,"hit output uses target position");Check(ev.ActionId==hitMatch.Human.PresentationActionId,"hit provenance");}
            var catchup=new MatchSimulation(FirstRosterSummoner.Kit);foreach(var p in catchup.Actors)p.Bot=false;
            for(int i=0;i<300;i++)catchup.Step(new MatchCommand{BasicHeld=true});cursor=0;count=0;double previous=-1;
            while(catchup.Presentation.Read(ref cursor,out ev))if(ev.Phase==PresentationPhase.Cast&&ev.ActorId==catchup.Human.Id){Check(ev.Time>previous,"catch-up order");previous=ev.Time;count++;}
            Check(count==3,"catch-up emits exactly three accepted basics");
            var blades=new MatchSimulation(FirstRosterSummoner.Riven);foreach(var p in blades.Actors)p.Bot=false;for(int i=0;i<190;i++)blades.Step(null);
            blades.Cast(blades.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0)));for(int i=0;i<60;i++)blades.Step(null);
            blades.Cast(blades.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0)));for(int i=0;i<60;i++)blades.Step(null);
            blades.Cast(blades.Human,new CastCommand(AbilitySlot.Basic,new V2(1,0)));for(int i=0;i<60;i++)blades.Step(null);
            var phases=new HashSet<int>();cursor=0;while(blades.Presentation.Read(ref cursor,out ev))if(ev.Phase==PresentationPhase.Blade)phases.Add(ev.Detail);
            Check(phases.Contains(0)&&phases.Contains(1)&&phases.Contains(2)&&phases.Contains(3),"outbound parked return orbit events");
            for(int segments=3;segments<=128;segments++)
            {
                var mesh=new DiscGeometry(segments);Check(mesh.Vertices.Length==segments*2&&mesh.Indices.Length==segments*6,"mesh sizes");
                foreach(var v in mesh.Vertices)Check(!double.IsNaN(v.X)&&!double.IsInfinity(v.Z)&&v.Length<=1.000001,"finite bounded mesh vertices");
                foreach(var i in mesh.Indices)Check(i>=0&&i<mesh.Vertices.Length,"mesh indices");
            }
            var boxes=new BoxGeometry();
            for(int i=0;i<300;i++)boxes.Box(-34+i%18*4,4.5,i%2==0?35:-35,3.4,9,2);
            Check(boxes.Vertices.Count==2400&&boxes.Indices.Count==10800,"combined structural mesh counts");
            foreach(var v in boxes.Vertices)Check(BoxGeometry.Finite(v.X)&&BoxGeometry.Finite(v.Y)&&BoxGeometry.Finite(v.Z)&&Math.Abs(v.X)<38&&v.Y>=0&&v.Y<=9&&Math.Abs(v.Z)<=36,"finite structural mesh bounds");
            foreach(var index in boxes.Indices)Check(index>=0&&index<boxes.Vertices.Count,"combined structural mesh indices");
            bool rejects=false;try{boxes.Box(double.NaN,0,0,1,1,1);}catch(ArgumentOutOfRangeException){rejects=true;}Check(rejects,"reject invalid procedural geometry");
            foreach(double aspect in new[]{1.333,1.778,2.165,2.6})
            {
                double extent=11*aspect,depth=PresentationMath.GroundDepth(11,50*Math.PI/180);
                for(int i=-100;i<=100;i++){double x=PresentationMath.ClampCenter(i,extent,34),z=PresentationMath.ClampCenter(i,depth,32);Check(Math.Abs(x)+extent<=34.000001&&Math.Abs(z)+depth<=32.000001,"ground frustum contained");}
            }
            Check(PresentationMath.ClampCenter(40,50,34)==0,"oversized frustum centers");
            for(int i=0;i<8;i++)Check(PresentationMath.Frame(i/12.0+1e-6,8,12,true)==i,"authored frame order");Check(PresentationMath.Frame(8/12.0+1e-6,8,12,true)==0,"loop boundary");
            int[] touches={9,11,15};Check(!TouchOwnership.Missing(11,touches,3)&&TouchOwnership.Missing(12,touches,3)&&TouchOwnership.Missing(9,touches,0),"multitouch/lost finger ownership");
            var input=new MatchInputState();var controlled=new MatchSimulation(FirstRosterSummoner.Riven).Human;
            input.MoveId=9;input.AimId=11;input.AbilityId=15;input.Movement=new V2(1,0);input.Aiming=input.BasicHeld=true;controlled.PendingSecond=true;
            input.Gesture.Press(AbilitySlot.Basic,new V2(1,0),1,5.2);
            input.CancelMissing(new[]{9,15},2,controlled);Check(input.MoveId==9&&input.AimId==-1&&input.AbilityId==15,"missing aim does not steal move/ability finger");
            input.CancelMissing(new[]{9},1,controlled);Check(input.MoveId==9&&input.AbilityId==-1&&!input.Gesture.Active&&!input.BasicHeld&&!controlled.PendingSecond,"missing ability cancels pending blade without releasing");
            input.Queued.Add(new CastCommand(AbilitySlot.Ultimate,new V2(1,0)));input.Reset(controlled);Check(input.MoveId==-1&&input.AimId==-1&&input.AbilityId==-1&&input.KeyboardSlot==-1&&input.Queued.Count==0&&input.Movement.Length==0,"focus/pause/death reset clears ownership and queued casts");
            input.MoveId=-2;input.CancelMissing(new int[0],0,controlled);Check(input.MoveId==-2,"mouse ownership unaffected by absent touch list");
            input.Cancel(-2,controlled);Check(input.MoveId==-1,"mouse cancel");
            var gesture=new AbilityGesture();gesture.Press(AbilitySlot.Ultimate,new V2(1,0),1,14);gesture.Cancel();CastCommand command;Check(!gesture.Release(5,out command),"focus/pause cancel cannot release a delayed cast");
            foreach(var pixels in new[]{new LayoutRect(0,0,960,540),new LayoutRect(47,0,750,390),new LayoutRect(59,0,734,393),new LayoutRect(0,0,1024,768)})
            {
                double width=pixels.Right+(pixels.X>0?pixels.X:0),height=pixels.Height;
                var safe=PresentationLayout.Safe(width,height,pixels,pixels.X/width,0,pixels.X/width,0);Check(Math.Abs(safe.X-pixels.X)<1e-5,"safe-area intersection not double offset");
                double scale=Math.Min(safe.Width/960,safe.Height/540);safe=new LayoutRect(safe.X/scale,0,safe.Width/scale,safe.Height/scale);
                double[] xs={.13,.9,.48,.61,.74,.87,.9},ys={.78,.46,.83,.83,.83,.83,.64};var controls=new LayoutRect[7];
                for(int i=0;i<7;i++){controls[i]=PresentationLayout.Control(safe,i,xs[i],ys[i],1);Check(controls[i].X>=safe.X&&controls[i].Right<=safe.Right&&controls[i].Bottom<=safe.Bottom,"controls inside safe area");}
                for(int i=0;i<7;i++)for(int j=i+1;j<7;j++)Check(!controls[i].Overlaps(controls[j]),"default controls do not overlap");
                var local=new LayoutRect(safe.X+safe.Width/2-225,safe.Y+safe.Height*.83-140,450,65);foreach(var c in controls)Check(!local.Overlaps(c),"local status clear of touch controls");
            }
            // Flood-fill the actual preserved map, not a decorative/nav substitute.
            var simulation=new MatchSimulation(FirstRosterSummoner.Kit);var seen=new HashSet<string>();var queue=new Queue<V2>();queue.Enqueue(new V2(-30,0));seen.Add("-30,0");
            while(queue.Count>0)
            {
                var p=queue.Dequeue();foreach(var d in new[]{new V2(1,0),new V2(-1,0),new V2(0,1),new V2(0,-1)})
                {var q=p+d;if(MatchMap.Blocked(q,.5))continue;string key=q.X+","+q.Z;if(seen.Add(key))queue.Enqueue(q);}
            }
            foreach(var camp in simulation.Camps)Check(seen.Contains(camp.Position.X+","+camp.Position.Z),"camp route reachable");foreach(var actor in simulation.Actors)Check(seen.Contains(actor.Spawn.X+","+actor.Spawn.Z),"spawn route reachable");
            return checks;
        }
    }
}
