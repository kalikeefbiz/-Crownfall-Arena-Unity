using System;
using System.Globalization;
using UnityEngine;
using UnityEngine.UIElements;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed partial class CrownfallMatchBootstrap
    {
        Vector4 browserInsets;
        float nextHud;
        long hudCursor;
        double feedbackUntil;
        void ConfigureProductionUi()
        {
            var ui=productionHud;
            void Sound(){audioDirector.UiEvent();}
            ui.Action(ui.Menu,"ENTER THE ARENA",new Rect(335,325,290,65),()=>{Sound();screen="select";});
            for(int i=0;i<3;i++){int roster=i;ui.Choices[i].clicked+=()=>{Sound();selected=(FirstRosterSummoner)roster;};}
            ui.Action(ui.Select,"MENU",new Rect(300,405,165,50),()=>{Sound();Menu();});
            ui.Action(ui.Select,"PLAY 3v3",new Rect(485,405,175,50),()=>{Sound();StartMatch();});
            ui.Action(ui.Results,"PLAY AGAIN",new Rect(300,410,175,55),()=>{Sound();StartMatch();});
            ui.Action(ui.Results,"MENU",new Rect(495,410,165,55),()=>{Sound();Menu();});
            // Only this button toggles pause for a pointer; the legacy sampler
            // cancels targeting on press but never also toggles pause.
            ui.PauseButton=ui.Action(ui.Match,"PAUSE",new Rect(),()=>{if(match!=null&&match.Result==null&&!editing){Sound();TogglePause();}});
            ui.Action(ui.Pause,"RESUME",new Rect(345,190,270,50),()=>{Sound();TogglePause();});
            ui.Action(ui.Pause,"EDIT CONTROLS",new Rect(345,250,270,50),()=>{Sound();OpenEditor();});
            ui.Action(ui.Pause,"MENU",new Rect(345,310,270,50),()=>{Sound();Menu();});
        }
        // CSS env() is measured, never applied as canvas padding. Merge it with
        // Screen.safeArea by intersection, so neither notch inset is applied twice.
        public void SetBrowserInsets(string csv)
        {
            var values=csv.Split(',');if(values.Length!=4)return;var n=new float[4];
            for(int i=0;i<4;i++)if(!float.TryParse(values[i],NumberStyles.Float,CultureInfo.InvariantCulture,out n[i])||float.IsNaN(n[i])||n[i]<0||n[i]>.3f)return;
            var next=new Vector4(n[0],n[1],n[2],n[3]);
            if(next!=browserInsets){browserInsets=next;if(match!=null)controls.Reset(match.Human);}
        }
        public void SuspendBrowserInput(string reason)
        {OnApplicationFocus(false);}
        void UpdateProductionUi()
        {
            var ui=productionHud;if(ui==null)return;
            var safe=SafeRect;ui.Layout(UiScale,UiWidth,UiHeight,safe);
            bool portrait=Screen.width<Screen.height;
            ProductionHud.Show(ui.Rotate,portrait);
            ProductionHud.Show(ui.Menu,!portrait&&screen=="menu");ProductionHud.Show(ui.Select,!portrait&&screen=="select");
            ProductionHud.Show(ui.Results,!portrait&&screen=="results");ProductionHud.Show(ui.Match,!portrait&&screen=="match"&&!editing);
            ProductionHud.Show(ui.Pause,!portrait&&screen=="match"&&paused&&!editing&&match!=null&&match.Result==null);
            if(screen=="select")for(int i=0;i<3;i++)ui.Choices[i].style.backgroundColor=i==(int)selected?new Color(.34f,.27f,.16f):new Color(.12f,.14f,.19f);
            if(match==null)return;
            ProductionHud.Place(ui.PauseButton,PauseRect);
            for(int i=0;i<7;i++)
            {
                ProductionHud.Place(ui.Controls[i],SlotRect(i,layout));ui.Controls[i].style.opacity=layout.opacities[i];
                ProductionHud.Show(ui.Controls[i],!paused&&!editing&&match.Result==null&&(i<2||!string.IsNullOrEmpty(match.AbilityName(match.Human,(AbilitySlot)(i-2)))));
            }
            var move=controls.MoveRect;var aim=controls.AimRect;
            ProductionHud.Place(ui.MoveKnob,new Rect(move.width/2-10+(float)controls.Movement.X*move.width*.28f,move.height/2-10-(float)controls.Movement.Z*move.height*.28f,20,20));
            ProductionHud.Place(ui.AimKnob,new Rect(aim.width/2-10+(float)controls.Aim.X*aim.width*.28f,aim.height/2-10-(float)controls.Aim.Z*aim.height*.28f,20,20));
            PresentationEvent feedbackEvent;
            while(match.Presentation.Read(ref hudCursor,out feedbackEvent))
                if(feedbackEvent.Phase==PresentationPhase.Objective||feedbackEvent.Phase==PresentationPhase.Death||feedbackEvent.Phase==PresentationPhase.Surge)feedbackUntil=feedbackEvent.Time+4;
            if(Time.unscaledTime<nextHud)return;nextHud=Time.unscaledTime+.1f;
            var human=match.Human;
            ui.Score.text=TimeText(Math.Max(0,300-match.Now))+"     "+match.Tickets[1]+"   /   "+match.Tickets[2]+" TICKETS\n"+Math.Round(match.CP[1])+"   /   "+Math.Round(match.CP[2])+" CROWNFALL";
            ui.Pressure.text=(Math.Round(match.BlueControl*100)+"% BLUE     /     "+Math.Round((1-match.BlueControl)*100)+"% RED")+(match.ScoringTeam!=0?"   •   SCORING +12 CP/s":"");
            ui.Status.text=human.Name+"   "+Math.Ceiling(human.Health.Current)+" / "+human.Health.Maximum+" HP   •   ULT "+Math.Floor(human.UltimateMeter)+"%";
            ui.Life.text=human.Eliminated?"ELIMINATED":human.Reserved?"RETURN IN "+Math.Ceiling(human.RespawnAt-match.Now)+"s":match.Protected(human)?"RESPAWN PROTECTED":human.StunnedUntil>match.Now?"STUNNED":!human.FinalAvailable?"FINAL LIFE":human.Roster==FirstRosterSummoner.Riven?(human.Pulse?"PULSE":"RESO")+" • "+(human.Returning?"RECALLING":"BLADES "+human.WeaponNext):"";
            foreach(var buff in human.Buffs)ui.Life.text+=" • "+buff.Key.ToUpperInvariant()+" "+Math.Ceiling(buff.Value.Until-match.Now)+"s";
            ProductionHud.Place(ui.Hp,new Rect(0,0,270*(float)(human.Health.Current/human.Health.Maximum),6));
            ui.Feedback.text=(match.Surge.Active?(match.Surge.ActiveTeam==1?"BLUE":"RED")+" SURGE • "+match.Surge.CanalsRemaining+" CANALS\n":"")+(match.Now<feedbackUntil&&match.Feed.Count>0?match.Feed[0]:"");
            ui.Countdown.text=match.Result!=null?Outcome():match.Phase==MatchPhase.Countdown?"PREPARE\n"+Mathf.CeilToInt((float)match.Countdown):controls.Gesture.Active?(controls.Gesture.Cancelled?"RELEASE TO CANCEL":"RELEASE TO CAST"):"";
            ProductionHud.Show(ui.Countdown,ui.Countdown.text.Length>0&&!paused);
            ui.Controls[0].text="MOVE";ui.Controls[1].text="AIM";
            for(int i=0;i<5;i++)
            {
                double remaining=Math.Max(0,human.ReadyAt[i]-match.Now);
                string status=remaining>.01?remaining.ToString("F1")+"s":i==3&&human.UltimateMeter<100?Math.Floor(human.UltimateMeter)+"%":i==4&&human.Roster==FirstRosterSummoner.Kit&&human.BlastUntil<=match.Now?"LOCKED":"READY";
                ui.Controls[i+2].text=match.AbilityName(human,(AbilitySlot)i)+"\n"+status;
            }
            int dot=0,label=0;
            void Actor(MatchEntity p)
            {
                var color=p.Team==0?new Color(1,.8f,.3f):TeamColor(p.Team);
                if(dot<ui.MiniDots.Length){var e=ui.MiniDots[dot++];ProductionHud.Show(e,p.Alive);ProductionHud.Place(e,new Rect((float)(p.Position.X+34)/68*155-3,(float)(32-p.Position.Z)/64*135-3,6,6));e.style.backgroundColor=p==human?Color.white:color;}
                if(label>=ui.WorldLabels.Length)return;
                var text=ui.WorldLabels[label++];var point=viewCamera.WorldToScreenPoint(MatchActorView.Ground(p.Position)+viewCamera.transform.up*(p.Kind==EntityKind.Summoner?productionArt.For(p.Roster).height+.15f:1.8f));
                bool visible=p.Alive&&point.z>0&&point.x>=0&&point.x<=Screen.width&&point.y>=0&&point.y<=Screen.height;
                ProductionHud.Show(text,visible);if(!visible)return;
                text.text=p.Name+"\n"+Math.Ceiling(p.Health.Current)+(match.Protected(p)?" ◆":"");text.style.color=color;
                ProductionHud.Place(text,new Rect(point.x/UiScale-58,(Screen.height-point.y)/UiScale-30,116,30));
            }
            foreach(var p in match.Actors)Actor(p);foreach(var c in match.Camps)Actor(c);foreach(var c in match.Canals)Actor(c);
            for(;dot<ui.MiniDots.Length;dot++)ProductionHud.Show(ui.MiniDots[dot],false);
            for(;label<ui.WorldLabels.Length;label++)ProductionHud.Show(ui.WorldLabels[label],false);
            ProductionHud.Place(ui.Front,new Rect((float)(match.Front+34)/68*155,0,1.5f,135));
            for(int i=0;i<6;i++)
            {
                var p=match.Actors[i];ui.Roster[i].text=p.Name+" • "+(p.Eliminated?"OUT":p.Reserved?"RETURN":!p.FinalAvailable?"FINAL":"");ui.Roster[i].style.color=TeamColor(p.Team);
                ui.ResultRows[i].text=(p==human?"YOU • ":"")+p.Name+"    "+p.Kills+" / "+p.Deaths+" / "+p.Assists+"    DAMAGE "+Math.Round(p.DamageDealt)+"    PRESSURE "+Math.Round(p.PressureSeconds)+"s";ui.ResultRows[i].style.color=TeamColor(p.Team);
            }
            if(match.Result!=null){ui.ResultTitle.text=Outcome();ui.ResultSummary.text=match.Result.Reason+" • "+TimeText(match.Now);}
        }
    }
}
