using System;
using UnityEngine;
using UnityEngine.UIElements;

namespace Crownfall.Match
{
    // Retained UI Toolkit tree, built once. Combat controls are display-only;
    // MatchTouchInput is still the only path that produces CastCommands.
    public sealed class ProductionHud
    {
        readonly UIDocument document;
        readonly PanelSettings panel;
        readonly ThemeStyleSheet theme;
        readonly VisualElement root;
        readonly RosterPresentationCatalog art;
        readonly Font font;
        readonly VisualElement[] centeredPages;
        public readonly VisualElement Menu,Select,Results,Match,Pause,Rotate;
        public readonly Label Score,Pressure,Status,Life,Feedback,Countdown,ResultTitle,ResultSummary;
        public readonly Label[] Controls=new Label[7],Roster=new Label[6],ResultRows=new Label[6],WorldLabels=new Label[16];
        public readonly VisualElement[] MiniDots=new VisualElement[16];
        public readonly VisualElement Minimap,Front,Hp,Health;
        public readonly VisualElement MoveKnob,AimKnob;
        public readonly Button[] Choices=new Button[3];
        public readonly Image[] AbilityIconSlots=new Image[5];
        public Button PauseButton;
        public ProductionHud(GameObject owner,RosterPresentationCatalog catalog)
        {
            art=catalog;font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            theme=ScriptableObject.CreateInstance<ThemeStyleSheet>();theme.name="Crownfall retained HUD theme";
            panel=ScriptableObject.CreateInstance<PanelSettings>();panel.themeStyleSheet=theme;panel.scaleMode=PanelScaleMode.ConstantPixelSize;panel.sortingOrder=10;
            document=owner.AddComponent<UIDocument>();document.panelSettings=panel;root=document.rootVisualElement;
            root.pickingMode=PickingMode.Ignore;root.style.unityFont=font;root.style.color=new Color(.93f,.9f,.82f);
            root.style.fontSize=16;
            Menu=Page();Select=Page();Results=Page();Match=Page();Pause=Page();Rotate=Page();
            Background(Menu,art.arena);Background(Select,art.lane);Background(Results,art.arena);
            Logo(Menu,new Rect(270,40,420,140));Logo(Select,new Rect(360,5,240,75));Logo(Results,new Rect(375,0,210,70));
            Text(Menu,"3 v 3   /   TERRITORY   /   WILDERNESS",new Rect(230,195,500,35),18);
            Text(Menu,"Take the lane. Contest the wilderness.\nTurn control into Crownfall.",new Rect(230,240,500,55),20);
            Text(Menu,"Move and aim independently. Drag a skill to aim; release to cast.\nDrag beyond the cancel boundary to cancel.",new Rect(210,410,540,55),14);
            Text(Select,"CHOOSE YOUR SUMMONER",new Rect(260,80,440,40),22);
            for(int i=0;i<3;i++)
            {
                var a=art.For((Combat.FirstRosterSummoner)i);var portrait=new Image{sprite=a.idle[0],scaleMode=ScaleMode.ScaleToFit,pickingMode=PickingMode.Ignore};Select.Add(portrait);Place(portrait,new Rect(120+i*270,115,180,190));
                Choices[i]=Action(Select,(i==0?"KIT ASHER\nMobile skirmisher":i==1?"SET\nFrontline tank":"RIVEN\nRanged Shaper"),new Rect(90+i*270,300,240,75),null);
            }
            Score=Text(Match,"",new Rect(250,8,460,60),20,true);
            Pressure=Text(Match,"",new Rect(250,70,460,35),13);
            Status=Text(Match,"",new Rect(255,491,450,27),14);
            Life=Text(Match,"",new Rect(255,462,450,27),13);
            Feedback=Text(Match,"",new Rect(235,115,490,65),14);
            Countdown=Text(Match,"",new Rect(300,185,360,90),24,true);
            Health=Block(Match,new Rect(345,483,270,6),new Color(.08f,.1f,.13f));Hp=Block(Health,new Rect(0,0,270,6),new Color(.3f,.73f,.94f));
            Minimap=Block(Match,new Rect(12,12,155,135),new Color(.04f,.055f,.07f,.95f));
            Block(Minimap,new Rect(0,42,155,51),new Color(.2f,.21f,.19f));
            foreach(var wall in MatchMap.Walls)Block(Minimap,new Rect((float)(wall.X+34-wall.Width/2)/68*155,(float)(32-wall.Z-wall.Depth/2)/64*135,(float)wall.Width/68*155,(float)wall.Depth/64*135),new Color(.36f,.34f,.29f));
            Front=Block(Minimap,new Rect(75,0,2,135),new Color(.85f,.68f,.34f));
            for(int i=0;i<16;i++)MiniDots[i]=Block(Minimap,new Rect(0,0,6,6),Color.white);
            for(int i=0;i<6;i++){Roster[i]=Text(Match,"",new Rect(12,153+i*19,172,19),12);ResultRows[i]=Text(Results,"",new Rect(145,150+i*35,670,31),14,true);}
            for(int i=0;i<7;i++)
            {
                Controls[i]=Text(Match,"",new Rect(),14,true);
                if(i<2){Controls[i].style.borderTopLeftRadius=Controls[i].style.borderTopRightRadius=Controls[i].style.borderBottomLeftRadius=Controls[i].style.borderBottomRightRadius=80;Controls[i].style.unityTextAlign=TextAnchor.UpperCenter;Controls[i].style.paddingTop=4;}
                else
                {
                    var icon=new Image{scaleMode=ScaleMode.ScaleToFit,pickingMode=PickingMode.Ignore};
                    Controls[i].Add(icon);Place(icon,new Rect(5,5,18,18));Show(icon,false);AbilityIconSlots[i-2]=icon;
                }
            }
            MoveKnob=Block(Controls[0],new Rect(46,46,20,20),new Color(.62f,.82f,1,.65f));
            AimKnob=Block(Controls[1],new Rect(46,46,20,20),new Color(1,.78f,.34f,.65f));
            Skin(MoveKnob,new Color(.62f,.82f,1,.65f));Skin(AimKnob,new Color(1,.78f,.34f,.65f));
            for(int i=0;i<16;i++)WorldLabels[i]=Text(Match,"",new Rect(),11,true);
            ResultTitle=Text(Results,"",new Rect(230,65,500,50),30);
            ResultSummary=Text(Results,"",new Rect(230,110,500,32),16);
            Text(Pause,"PAUSED",new Rect(300,115,360,55),26,true);
            centeredPages=new[]{Menu,Select,Results,Pause,Rotate};
            Text(Rotate,"Rotate your device\nto landscape",new Rect(200,185,560,150),40,true);
        }
        VisualElement Page(){var p=new VisualElement{pickingMode=PickingMode.Ignore};root.Add(p);p.style.position=Position.Absolute;p.style.display=DisplayStyle.None;return p;}
        static void Skin(VisualElement e,Color color)
        {
            e.style.backgroundColor=color;e.style.borderTopWidth=e.style.borderBottomWidth=e.style.borderLeftWidth=e.style.borderRightWidth=1;
            e.style.borderTopColor=e.style.borderBottomColor=e.style.borderLeftColor=e.style.borderRightColor=new Color(.62f,.49f,.27f,.6f);
            e.style.borderTopLeftRadius=e.style.borderTopRightRadius=e.style.borderBottomLeftRadius=e.style.borderBottomRightRadius=10;
        }
        void Background(VisualElement page,Texture2D image)
        {
            var bg=new VisualElement{pickingMode=PickingMode.Ignore};page.Add(bg);bg.style.position=Position.Absolute;bg.style.left=bg.style.top=bg.style.right=bg.style.bottom=0;
            bg.style.backgroundImage=image;bg.style.unityBackgroundImageTintColor=new Color(.27f,.29f,.32f,1);
        }
        void Logo(VisualElement page,Rect rect){var logo=new Image{image=art.title,scaleMode=ScaleMode.ScaleToFit,pickingMode=PickingMode.Ignore};page.Add(logo);Place(logo,rect);}
        public Label Text(VisualElement parent,string text,Rect rect,int size,bool panelBackground=false)
        {
            var label=new Label(text){pickingMode=PickingMode.Ignore};parent.Add(label);label.style.whiteSpace=WhiteSpace.Normal;label.style.unityTextAlign=TextAnchor.MiddleCenter;label.style.fontSize=size;
            if(panelBackground)Skin(label,new Color(.045f,.055f,.075f,.9f));Place(label,rect);return label;
        }
        public Button Action(VisualElement parent,string text,Rect rect,Action callback)
        {
            var button=new Button(callback){text=text};parent.Add(button);button.style.fontSize=18;button.style.unityFont=font;button.style.color=new Color(.96f,.92f,.83f);button.style.whiteSpace=WhiteSpace.Normal;
            button.style.unityTextAlign=TextAnchor.MiddleCenter;
            Skin(button,new Color(.12f,.14f,.19f,.97f));Place(button,rect);return button;
        }
        static VisualElement Block(VisualElement parent,Rect rect,Color color){var e=new VisualElement{pickingMode=PickingMode.Ignore};parent.Add(e);e.style.backgroundColor=color;Place(e,rect);return e;}
        public static void Place(VisualElement e,Rect rect){e.style.position=Position.Absolute;e.style.left=rect.x;e.style.top=rect.y;e.style.width=rect.width;e.style.height=rect.height;}
        public static void Show(VisualElement e,bool show){e.style.display=show?DisplayStyle.Flex:DisplayStyle.None;}
        public void BindAbilityIcon(AbilitySlot slot,Sprite suppliedIcon)
        {var icon=AbilityIconSlots[(int)slot];icon.sprite=suppliedIcon;Show(icon,suppliedIcon!=null);}
        public void Layout(float scale,float width,float height,Rect safe)
        {
            panel.scale=scale;
            foreach(var p in centeredPages)Place(p,new Rect(safe.center.x-480,safe.center.y-270,960,540));
            Place(Match,new Rect(0,0,width,height));
            Place(Minimap,new Rect(safe.x+12,safe.y+12,155,135));
            float center=safe.center.x;
            Place(Score,new Rect(center-230,safe.y+8,460,60));Place(Pressure,new Rect(center-230,safe.y+70,460,35));
            Place(Status,new Rect(center-225,safe.y+safe.height*.83f-110,450,27));Place(Life,new Rect(center-225,safe.y+safe.height*.83f-140,450,27));
            Place(Health,new Rect(center-135,safe.y+safe.height*.83f-82,270,6));
            Place(Feedback,new Rect(center-245,safe.y+111,490,65));Place(Countdown,new Rect(center-180,safe.center.y-45,360,90));
            for(int i=0;i<6;i++)Place(Roster[i],new Rect(safe.x+12,safe.y+153+i*19,172,19));
        }
        public void Dispose(){UnityEngine.Object.Destroy(document);UnityEngine.Object.Destroy(panel);UnityEngine.Object.Destroy(theme);}
    }
}
