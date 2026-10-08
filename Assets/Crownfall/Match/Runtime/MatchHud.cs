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
        float UiScale => Mathf.Max(.1f,Mathf.Min(SafePixels.width/960f,SafePixels.height/540f));
        float UiWidth => Screen.width/UiScale;
        float UiHeight => Screen.height/UiScale;
        Rect PauseRect => new Rect(SafeRect.xMax-100,SafeRect.y+12,85,38);
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
        Rect SafePixels
        {
            get
            {
                var safe=Screen.safeArea;
                var merged=PresentationLayout.Safe(Screen.width,Screen.height,new LayoutRect(safe.x,Screen.height-safe.yMax,safe.width,safe.height),browserInsets.x,browserInsets.y,browserInsets.z,browserInsets.w);
                return new Rect((float)merged.X,Screen.height-(float)merged.Bottom,(float)merged.Width,(float)merged.Height);
            }
        }
        Rect SafeRect
        {get{var safe=SafePixels;return new Rect(safe.x/UiScale,(Screen.height-safe.yMax)/UiScale,safe.width/UiScale,safe.height/UiScale);}}
        Rect SlotRect(int index,ControlLayout value)
        {
            var safe=SafeRect;var p=value.positions[index];
            var rect=PresentationLayout.Control(new LayoutRect(safe.x,safe.y,safe.width,safe.height),index,p.x,p.y,value.sizes[index]);
            return new Rect((float)rect.X,(float)rect.Y,(float)rect.Width,(float)rect.Height);
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
            if(!editing||Screen.width<Screen.height)return;
            Styles();var previous=GUI.matrix;GUI.matrix=Matrix4x4.TRS(Vector3.zero,Quaternion.identity,new Vector3(UiScale,UiScale,1));
            DrawEditor();GUI.color=Color.white;GUI.matrix=previous;
        }
        string Outcome()=>match.Result.Winner==1?"VICTORY — BLUE":match.Result.Winner==2?"DEFEAT — RED":"DRAW";
        static string TimeText(double seconds)=>((int)seconds/60).ToString("00")+":"+((int)seconds%60).ToString("00");
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
