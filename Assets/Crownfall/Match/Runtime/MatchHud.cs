using System;
using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed partial class CrownfallMatchBootstrap
    {
        [Serializable] sealed class ControlLayout
        {
            public int version=1;
            public Vector2[] positions;
            public float[] sizes=new float[7],opacities=new float[7];
        }
        ControlLayout layout,draft;
        int editSlot,dragSlot=-1;
        string layoutError="";
        GUIStyle title,body,small,button;
        float UiScale => Mathf.Max(.35f,Mathf.Min(Screen.width/960f,Screen.height/540f));
        float UiWidth => Screen.width/UiScale;
        float UiHeight => Screen.height/UiScale;
        Rect PauseRect => new Rect(UiWidth-100,12,85,38);
        static ControlLayout DefaultLayout() => new ControlLayout{positions=new[]{new Vector2(.13f,.78f),new Vector2(.9f,.46f),new Vector2(.48f,.83f),new Vector2(.61f,.83f),new Vector2(.74f,.83f),new Vector2(.87f,.83f),new Vector2(.9f,.64f)},sizes=new float[]{1,1,1,1,1,1,1},opacities=new float[]{.9f,.9f,.9f,.9f,.9f,.9f,.9f}};
        void LoadLayout()
        {
            layout=DefaultLayout();
            if(!PlayerPrefs.HasKey("Crownfall.Controls.v1"))return;
            try{var value=JsonUtility.FromJson<ControlLayout>(PlayerPrefs.GetString("Crownfall.Controls.v1"));if(ValidLayout(value))layout=value;}catch(ArgumentException){layout=DefaultLayout();}
        }
        static bool ValidLayout(ControlLayout value)
        {
            if(value==null||value.version!=1||value.positions==null||value.positions.Length!=7||value.sizes==null||value.opacities==null||value.sizes.Length!=7||value.opacities.Length!=7)return false;
            for(int i=0;i<7;i++)if(float.IsNaN(value.sizes[i])||float.IsNaN(value.opacities[i])||value.sizes[i]<.8f||value.sizes[i]>1.35f||value.opacities[i]<.35f||value.opacities[i]>1)return false;
            foreach(var p in value.positions)if(float.IsNaN(p.x)||float.IsNaN(p.y)||p.x<0||p.x>1||p.y<.35f||p.y>1)return false;
            return true;
        }
        Rect SafeRect
        {
            get{var safe=Screen.safeArea;return new Rect(safe.x/UiScale,(Screen.height-safe.yMax)/UiScale,safe.width/UiScale,safe.height/UiScale);}
        }
        Rect SlotRect(int index,ControlLayout value)
        {
            var safe=SafeRect;var size=index<2?new Vector2(112,112):new Vector2(110,65);size*=value.sizes[index];
            var p=value.positions[index];float x=safe.x+p.x*safe.width,y=safe.y+p.y*safe.height;
            return new Rect(Mathf.Clamp(x-size.x/2,safe.x,safe.xMax-size.x),Mathf.Clamp(y-size.y/2,safe.y+140,safe.yMax-size.y),size.x,size.y);
        }
        void LayoutRects()
        {
            if(layout==null)return;
            var value=editing&&draft!=null?draft:layout;
            controls.MoveRect=SlotRect(0,value);controls.AimRect=SlotRect(1,value);
            for(int i=0;i<5;i++)controls.AbilityRects[i]=SlotRect(i+2,value);
        }
        void Styles()
        {
            if(title!=null)return;
            title=new GUIStyle(GUI.skin.label){fontSize=30,alignment=TextAnchor.MiddleCenter,wordWrap=true};
            body=new GUIStyle(GUI.skin.label){fontSize=17,alignment=TextAnchor.MiddleCenter,wordWrap=true};
            small=new GUIStyle(GUI.skin.label){fontSize=13,alignment=TextAnchor.MiddleCenter,wordWrap=true};
            button=new GUIStyle(GUI.skin.button){fontSize=16,wordWrap=true};
        }
        void Box(Rect r,string text,GUIStyle style=null){GUI.Box(r,GUIContent.none);GUI.Label(r,text,style??body);}
        bool Button(Rect r,string text)=>GUI.Button(r,text,button);
        void OnGUI()
        {
            Styles();var previous=GUI.matrix;GUI.matrix=Matrix4x4.TRS(Vector3.zero,Quaternion.identity,new Vector3(UiScale,UiScale,1));
            float center=UiWidth/2;
            if(Screen.width<Screen.height){Box(new Rect(center-200,UiHeight/2-65,400,130),"Rotate to landscape to play Crownfall",title);GUI.matrix=previous;return;}
            if(screen=="menu")
            {
                Box(new Rect(center-290,90,580,125),"CROWNFALL ARENA\n3v3 • Territory • Wilderness",title);
                GUI.Label(new Rect(center-280,235,560,55),"Win through territorial control, Crownfall points or elimination.\nShared tickets fund respawns, then every Summoner gets one final return.",body);
                if(Button(new Rect(center-140,320,280,60),"Play 3v3"))screen="select";
                GUI.Label(new Rect(center-300,410,600,75),"Move: WASD / left pad    Aim: right mouse / right pad\nBasic: Space    Skills: Q / E    Ultimate: R    Stance / Blast: F\nDrag an ability to aim, release to cast; drag far away to cancel.",small);
            }
            else if(screen=="select")
            {
                GUI.Label(new Rect(center-250,38,500,55),"Choose your Blue Summoner",title);
                string[] roles={"Kit Asher\nMobile skirmisher\nWhip • Step • Flame Burst","Set\nFrontline tank\nClaw • War Cry • Contact leap","Riven\nRanged Shaper\nReso recall • Pulse • Stance"};
                for(int i=0;i<3;i++)
                {
                    var rect=new Rect(center-405+i*275,145,260,190);GUI.color=selected==(FirstRosterSummoner)i?new Color(1,.86f,.55f):Color.white;
                    if(Button(rect,roles[i]))selected=(FirstRosterSummoner)i;GUI.color=Color.white;
                }
                GUI.Label(new Rect(center-320,345,640,35),"Both teams field Kit, Set and Riven. Your five teammates/opponents use bots.",small);
                if(Button(new Rect(center-180,408,170,55),"Menu"))Menu();
                if(Button(new Rect(center+10,408,170,55),"Enter Arena"))StartMatch();
            }
            else if(screen=="results"&&match!=null)DrawResults();
            else if(screen=="match"&&match!=null)
            {
                DrawMatchHud();
                if(match.Result!=null)Box(new Rect(center-250,180,500,110),Outcome()+"\n"+match.Result.Reason,title);
                else if(editing)DrawEditor();
                else if(paused)
                {
                    Box(new Rect(center-180,110,360,270),"Paused",title);
                    if(Button(new Rect(center-145,175,290,45),"Resume"))TogglePause();
                    if(Button(new Rect(center-145,230,290,45),"Edit controls"))OpenEditor();
                    if(Button(new Rect(center-145,285,290,45),"Return to Menu"))Menu();
                }
                else if(match.Phase==MatchPhase.Countdown)Box(new Rect(center-210,170,420,100),"Prepare — "+match.Human.Name+"\n"+Mathf.CeilToInt((float)match.Countdown),title);
            }
            GUI.color=Color.white;GUI.matrix=previous;
        }
        string Outcome()=>match.Result.Winner==1?"VICTORY — BLUE":match.Result.Winner==2?"DEFEAT — RED":"DRAW";
        void DrawResults()
        {
            float center=UiWidth/2;
            GUI.Label(new Rect(center-350,15,700,55),Outcome(),title);
            GUI.Label(new Rect(center-350,72,700,35),match.Result.Reason+" • "+TimeText(match.Now)+" • CP "+Math.Round(match.CP[1])+" : "+Math.Round(match.CP[2]),body);
            for(int i=0;i<6;i++)
            {
                var p=match.Actors[i];GUI.color=TeamColor(p.Team);
                Box(new Rect(center-360,125+i*43,720,39),(i==0?"YOU • ":"")+p.Name+"   K/D/A "+p.Kills+" / "+p.Deaths+" / "+p.Assists+"   Damage "+Math.Round(p.DamageDealt)+"   Pressure "+Math.Round(p.PressureSeconds)+"s",body);
            }
            GUI.color=Color.white;
            if(Button(new Rect(center-185,418,175,55),"Play Again"))StartMatch();
            if(Button(new Rect(center+10,418,175,55),"Menu"))Menu();
        }
        static string TimeText(double seconds)=>((int)seconds/60).ToString("00")+":"+((int)seconds%60).ToString("00");
        void Fill(Rect r,float fraction,Color color){GUI.color=new Color(.07f,.08f,.09f);GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=color;GUI.DrawTexture(new Rect(r.x,r.y,r.width*Mathf.Clamp01(fraction),r.height),Texture2D.whiteTexture);GUI.color=Color.white;}
        void DrawMatchHud()
        {
            float center=UiWidth/2;
            Box(new Rect(center-230,8,460,74),TimeText(Math.Max(0,300-match.Now))+"    BLUE "+Math.Round(match.BlueControl*100)+"% : "+Math.Round((1-match.BlueControl)*100)+"% RED\nCP "+Math.Round(match.CP[1])+" / 1000 : "+Math.Round(match.CP[2])+" / 1000    Tickets "+match.Tickets[1]+" : "+match.Tickets[2],body);
            Fill(new Rect(center-220,83,440,8),(float)match.BlueControl,TeamColor(1));
            GUI.Label(new Rect(center-250,93,500,26),match.ScoringTeam!=0?(match.ScoringTeam==1?"Blue":"Red")+" scoring +12 CP/s":match.PressureTeam!=0?(match.PressureTeam==1?"Blue":"Red")+" pressure — grace "+Math.Max(0,2-match.PressureAge).ToString("F1")+"s":"Neutral lane",small);
            if(match.Surge.Active)GUI.Label(new Rect(center-250,119,500,25),(match.Surge.ActiveTeam==1?"BLUE":"RED")+" SURGE • "+match.Surge.CanalsRemaining+" Canals remaining",small);
            if(Button(PauseRect,paused?"Resume":"Pause"))TogglePause();
            var human=match.Human;
            Fill(new Rect(center-160,UiHeight-40,320,14),(float)(human.Health.Current/human.Health.Maximum),TeamColor(1));
            GUI.Label(new Rect(center-250,UiHeight-24,500,24),human.Name+" HP "+Math.Ceiling(human.Health.Current)+" / "+human.Health.Maximum+"    Ultimate "+Math.Floor(human.UltimateMeter)+"%",small);
            string life=human.Eliminated?"PERMANENTLY ELIMINATED":human.Reserved?"Respawn in "+Math.Max(0,human.RespawnAt-match.Now).ToString("F1")+"s":match.Protected(human)?"Respawn protected":human.FinalAvailable?"Final respawn available":"FINAL LIFE — no personal return";
            if(human.StunnedUntil>match.Now)life+=" • STUNNED";
            if(human.Roster==FirstRosterSummoner.Riven)life+=" • "+(human.Pulse?"PULSE":"RESO")+" • Blades "+human.WeaponNext+(human.Returning?" returning":"");
            if(human.Roster==FirstRosterSummoner.Kit)life+=" • Ember streak "+human.Streak;
            foreach(var buff in human.Buffs)if(buff.Value.Until>match.Now)life+=" • "+buff.Key+" "+Math.Ceiling(buff.Value.Until-match.Now)+"s";
            GUI.Label(new Rect(center-360,UiHeight-66,720,26),life,small);
            for(int i=0;i<match.Feed.Count;i++)GUI.Label(new Rect(195,145+i*22,UiWidth-390,22),match.Feed[i],small);
            DrawMinimap();DrawWorldLabels();
            if(!paused&&!editing&&match.Result==null)
            {
                GUI.color=new Color(1,1,1,layout.opacities[0]);Box(controls.MoveRect,"MOVE\nW A S D",small);
                GUI.color=new Color(1,1,1,layout.opacities[1]);Box(controls.AimRect,"AIM\nindependent",small);
                for(int i=0;i<5;i++)
                {
                    var slot=(AbilitySlot)i;string name=match.AbilityName(human,slot);if(string.IsNullOrEmpty(name))continue;
                    double remaining=Math.Max(0,human.ReadyAt[i]-match.Now);
                    string status=remaining>.01?remaining.ToString("F1")+"s":slot==AbilitySlot.Ultimate&&human.UltimateMeter<100?Math.Floor(human.UltimateMeter)+"%":slot==AbilitySlot.Special&&human.Roster==FirstRosterSummoner.Kit?(human.BlastUntil>match.Now?Math.Ceiling(human.BlastUntil-match.Now)+"s grant":"Locked"):"Ready";
                    GUI.color=new Color(1,1,1,layout.opacities[i+2]);Box(controls.AbilityRects[i],name+"\n"+status,small);
                }
                GUI.color=Color.white;
                if(controls.Gesture.Active)GUI.Label(new Rect(center-260,UiHeight-115,520,30),controls.Gesture.Cancelled?"Release to cancel":"Release to cast • drag far away to cancel",small);
            }
        }
        void DrawWorldLabels()
        {
            foreach(var v in actors)
            {
                var p=v.Actor;if(!p.Alive)continue;var point=viewCamera.WorldToScreenPoint(v.WorldPosition+Vector3.up*2.5f);
                if(point.z<0)continue;float x=point.x/UiScale,y=(Screen.height-point.y)/UiScale;
                if(x<0||x>UiWidth||y<0||y>UiHeight)continue;
                GUI.Label(new Rect(x-62,y-20,124,20),p.Name+(match.Protected(p)?" ◆":""),small);
                Fill(new Rect(x-27,y+2,54,5),(float)(p.Health.Current/p.Health.Maximum),TeamColor(p.Team));
            }
        }
        void DrawMinimap()
        {
            Rect r=new Rect(12,12,170,145);GUI.Box(r,GUIContent.none);
            Func<V2,Vector2> map=p=>new Vector2(r.x+(float)(p.X+34)/68*r.width,r.y+(float)(32-p.Z)/64*r.height);
            var frontPoint=map(new V2(match.Front,0));GUI.color=Color.gray;GUI.DrawTexture(new Rect(frontPoint.x,r.y,.8f,r.height),Texture2D.whiteTexture);
            foreach(var c in match.Camps){var p=map(c.Position);GUI.color=c.Alive?new Color(1,.8f,.3f):Color.gray;GUI.DrawTexture(new Rect(p.x-3,p.y-3,6,6),Texture2D.whiteTexture);}
            foreach(var p in match.Actors)if(p.Alive){var point=map(p.Position);GUI.color=p==match.Human?Color.white:TeamColor(p.Team);GUI.DrawTexture(new Rect(point.x-3,point.y-3,6,6),Texture2D.whiteTexture);}
            foreach(var c in match.Canals)if(c.Alive){var point=map(c.Position);GUI.color=TeamColor(c.Team);GUI.DrawTexture(new Rect(point.x-4,point.y-4,8,8),Texture2D.whiteTexture);}
            GUI.color=Color.white;
            GUI.Label(new Rect(12,158,170,45),"Gold: camps / Major\nBlue → Crownfall Lane ← Red",small);
            for(int i=0;i<6;i++)
            {
                var p=match.Actors[i];GUI.color=TeamColor(p.Team);
                GUI.Label(new Rect(12,209+i*19,172,19),p.Name+" • "+(p.Eliminated?"OUT":p.Reserved?"respawn":p.FinalAvailable?"final ready":"final life"),small);
            }
            GUI.color=Color.white;
        }
        void OpenEditor()
        {
            editing=true;paused=true;draft=JsonUtility.FromJson<ControlLayout>(JsonUtility.ToJson(layout));layoutError="";controls.Reset(match.Human);
        }
        void DrawEditor()
        {
            if(resetConfirm)
            {
                float popupCenter=UiWidth/2;
                Box(new Rect(popupCenter-180,200,360,145),"Reset draft to default controls?",body);
                if(Button(new Rect(popupCenter-165,290,150,40),"Confirm Reset")){draft=DefaultLayout();resetConfirm=false;layoutError="";}
                if(Button(new Rect(popupCenter+15,290,150,40),"Cancel"))resetConfirm=false;
                return;
            }
            string[] labels={"Movement","Aim","Basic","Skill 1","Skill 2","Ultimate","Special"};
            for(int i=0;i<7;i++)
            {
                Rect r=SlotRect(i,draft);GUI.color=i==editSlot?new Color(1,.85f,.4f):Color.white;Box(r,labels[i],small);
                var ev=Event.current;
                if(ev.type==EventType.MouseDown&&r.Contains(ev.mousePosition)){editSlot=dragSlot=i;ev.Use();}
                if(dragSlot==i&&ev.type==EventType.MouseDrag)
                {
                    var safe=SafeRect;draft.positions[i]=new Vector2(Mathf.Clamp01((ev.mousePosition.x-safe.x)/safe.width),Mathf.Clamp((ev.mousePosition.y-safe.y)/safe.height,.35f,1));ev.Use();
                }
                if(ev.type==EventType.MouseUp)dragSlot=-1;
            }
            GUI.color=Color.white;
            float center=UiWidth/2;
            Box(new Rect(center-250,155,500,collapsed?65:245),"Controls — simulation paused",body);
            if(Button(new Rect(center+130,162,110,32),collapsed?"Expand":"Collapse"))collapsed=!collapsed;
            if(!collapsed)
            {
                if(Button(new Rect(center-235,200,40,30),"←"))editSlot=(editSlot+6)%7;
                GUI.Label(new Rect(center-190,200,370,30),labels[editSlot]+" • drag to position",small);
                if(Button(new Rect(center+195,200,40,30),"→"))editSlot=(editSlot+1)%7;
                GUI.Label(new Rect(center-235,232,80,20),"Position",small);
                var pos=draft.positions[editSlot];pos.x=GUI.HorizontalSlider(new Rect(center-145,239,160,20),pos.x,0,1);pos.y=GUI.HorizontalSlider(new Rect(center+30,239,160,20),pos.y,.35f,1);draft.positions[editSlot]=pos;
                GUI.Label(new Rect(center-235,262,85,25),"Scale",small);draft.sizes[editSlot]=GUI.HorizontalSlider(new Rect(center-145,272,330,20),draft.sizes[editSlot],.8f,1.35f);
                GUI.Label(new Rect(center-235,292,85,25),"Opacity",small);draft.opacities[editSlot]=GUI.HorizontalSlider(new Rect(center-145,302,330,20),draft.opacities[editSlot],.35f,1);
                if(Button(new Rect(center-235,345,145,40),"Save"))
                {
                    bool overlap=false;for(int i=0;i<7;i++)for(int j=i+1;j<7;j++)if(SlotRect(i,draft).Overlaps(SlotRect(j,draft)))overlap=true;
                    if(!ValidLayout(draft)||overlap)layoutError="Separate overlapping controls before saving.";
                    else {layout=draft;PlayerPrefs.SetString("Crownfall.Controls.v1",JsonUtility.ToJson(layout));PlayerPrefs.Save();editing=false;controls.Reset(match.Human);}
                }
                if(Button(new Rect(center-72,345,145,40),"Cancel")){editing=false;draft=null;controls.Reset(match.Human);}
                if(Button(new Rect(center+90,345,145,40),"Reset"))resetConfirm=true;
            }
            GUI.Label(new Rect(center-250,405,500,35),layoutError,small);

        }
    }
}
