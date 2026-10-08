using System.Collections.Generic;
using UnityEngine;
using Crownfall.Combat;

namespace Crownfall.Match
{
    public sealed partial class CrownfallMatchBootstrap : MonoBehaviour
    {
        [SerializeField] KitSpriteSet kit;
        [SerializeField] BasicSpriteSet kitBasicSprites;
        [SerializeField] BasicAttackDefinition kitBasic;
        [SerializeField] Material solidMaterial,spriteMaterial,effectMaterial,territoryMaterial;
        readonly List<Material> materials=new List<Material>();
        readonly List<MatchActorView> actors=new List<MatchActorView>();
        readonly Dictionary<Projectile,GameObject> shots=new Dictionary<Projectile,GameObject>();
        readonly Dictionary<MatchEffect,LineRenderer> effects=new Dictionary<MatchEffect,LineRenderer>();
        readonly Dictionary<TimedAction,LineRenderer> telegraphs=new Dictionary<TimedAction,LineRenderer>();
        readonly MatchTouchInput controls=new MatchTouchInput();
        MatchSimulation match;
        GameObject world;
        Camera viewCamera;
        MobaCamera follow;
        Transform blueTerritory,redTerritory,front;
        LineRenderer preview;
        Material blueFlow,redFlow;
        readonly Material[] projectileMaterials=new Material[3];
        FirstRosterSummoner selected;
        string screen="menu";
        bool paused,editing,resetConfirm,collapsed;
        double accumulator;
        float victoryAt=-1;
        Vector2 screenSize;
        static Color TeamColor(int team) => team==1?new Color(.24f,.61f,1):team==2?new Color(1,.34f,.37f):new Color(.8f,.72f,.3f);
        void Awake()
        {
            Application.targetFrameRate=60;
            Physics.IgnoreLayerCollision(8,8,true);
            LoadLayout();
            var cameraObject=new GameObject("Crownfall MOBA camera");viewCamera=cameraObject.AddComponent<Camera>();cameraObject.tag="MainCamera";
            viewCamera.orthographic=true;viewCamera.orthographicSize=11;viewCamera.nearClipPlane=.1f;viewCamera.farClipPlane=150;
            viewCamera.backgroundColor=new Color(.035f,.055f,.075f);follow=cameraObject.AddComponent<MobaCamera>();
            cameraObject.transform.position=new Vector3(0,35,-28);cameraObject.transform.rotation=Quaternion.Euler(50,0,0);
        }
        Material Tint(Color color)
        {var m=new Material(solidMaterial);m.color=color;materials.Add(m);return m;}
        GameObject Shape(string name,PrimitiveType type,Vector3 position,Vector3 scale,Material material,bool collision=false)
        {
            var go=GameObject.CreatePrimitive(type);go.name=name;go.transform.SetParent(world.transform,false);go.transform.position=position;go.transform.localScale=scale;
            go.GetComponent<Renderer>().sharedMaterial=material;if(!collision)Destroy(go.GetComponent<Collider>());return go;
        }
        void StartMatch()
        {
            ClearWorld();match=new MatchSimulation(selected,kitBasic.Snapshot());accumulator=0;paused=editing=false;victoryAt=-1;screen="match";
            controls.Reset(match.Human);world=new GameObject("Crownfall 3v3 XZ arena");
            Shape("Arena",PrimitiveType.Cube,new Vector3(0,-.5f,0),new Vector3(68,1,64),Tint(new Color(.14f,.23f,.21f)),true);
            Shape("Lane",PrimitiveType.Cube,new Vector3(0,.004f,0),new Vector3(56,.008f,24),Tint(new Color(.22f,.28f,.28f)));
            var boundary=Tint(new Color(.28f,.34f,.38f));
            Shape("West boundary",PrimitiveType.Cube,new Vector3(-34.5f,1,0),new Vector3(1,2,65),boundary,true);
            Shape("East boundary",PrimitiveType.Cube,new Vector3(34.5f,1,0),new Vector3(1,2,65),boundary,true);
            Shape("North boundary",PrimitiveType.Cube,new Vector3(0,1,32.5f),new Vector3(68,2,1),boundary,true);
            Shape("South boundary",PrimitiveType.Cube,new Vector3(0,1,-32.5f),new Vector3(68,2,1),boundary,true);
            var wallMat=Tint(new Color(.38f,.36f,.3f));
            foreach(var w in MatchMap.Walls)Shape("Wilderness island",PrimitiveType.Cube,new Vector3((float)w.X,(float)w.Height/2,(float)w.Z),new Vector3((float)w.Width,(float)w.Height,(float)w.Depth),wallMat,true);
            // Native X/Z territory surface uses restrained tint and an authoritative front marker.
            blueFlow=new Material(territoryMaterial);blueFlow.color=new Color(.18f,.31f,.36f);materials.Add(blueFlow);
            redFlow=new Material(territoryMaterial);redFlow.color=new Color(.32f,.23f,.26f);materials.Add(redFlow);
            blueTerritory=Shape("Blue territory",PrimitiveType.Cube,Vector3.zero,Vector3.one,blueFlow).transform;
            redTerritory=Shape("Red territory",PrimitiveType.Cube,Vector3.zero,Vector3.one,redFlow).transform;
            front=Shape("Authoritative territorial front",PrimitiveType.Cube,Vector3.zero,new Vector3(.09f,.035f,24),Tint(new Color(.83f,.78f,.57f))).transform;
            projectileMaterials[1]=Tint(TeamColor(1));projectileMaterials[2]=Tint(TeamColor(2));
            foreach(var p in match.Actors)AddView(p);
            foreach(var c in match.Camps)
            {
                AddView(c);var ring=Ring(c.Name+" home",Tint(new Color(.34f,.39f,.25f)));Circle(ring,c.Spawn,c.Radius+1,.045f);
            }
            preview=Ring("Ability targeting preview",effectMaterial);
            follow.Bind(actors[0].transform);Physics.SyncTransforms();
        }
        void AddView(MatchEntity p)
        {
            var go=new GameObject(p.Name+" "+p.Id);go.transform.SetParent(world.transform,false);
            Color color=p.Kind==EntityKind.Summoner?(p.Roster==FirstRosterSummoner.Set?new Color(.66f,.46f,.84f):new Color(.36f,.86f,.72f)):p.Kind==EntityKind.Canal?TeamColor(p.Team):p.CampType=="damage"?new Color(.92f,.43f,.19f):new Color(.67f,.67f,.36f);
            var v=go.AddComponent<MatchActorView>();v.Bind(match,p,kit,kitBasicSprites,viewCamera,spriteMaterial,Tint(color));actors.Add(v);
            var marker=Shape("Team grounding "+p.Id,PrimitiveType.Cylinder,MatchActorView.Ground(p.Position),new Vector3((float)p.Radius*2,.018f,(float)p.Radius*2),Tint(TeamColor(p.Team)));
            marker.transform.SetParent(go.transform,true);v.RefreshRenderers();
        }
        LineRenderer Ring(string name,Material material)
        {
            var go=new GameObject(name);go.transform.SetParent(world.transform,false);var line=go.AddComponent<LineRenderer>();
            line.useWorldSpace=true;line.sharedMaterial=material;line.startWidth=line.endWidth=.075f;return line;
        }
        static void Circle(LineRenderer line,V2 point,double radius,float y=.07f)
        {
            line.loop=true;line.positionCount=48;
            for(int i=0;i<48;i++){float a=i*Mathf.PI*2/48;line.SetPosition(i,new Vector3((float)point.X+Mathf.Cos(a)*(float)radius,y,(float)point.Z+Mathf.Sin(a)*(float)radius));}
        }
        void Update()
        {
            LayoutRects();
            if(Screen.width<Screen.height&&screen=="match"&&match!=null){paused=true;controls.Reset(match.Human);}
            bool active=screen=="match"&&!paused&&!editing&&match!=null&&match.Active;
            Input.simulateMouseWithTouches=!active;
            if(screen!="match"||match==null)return;
            if(screenSize.x!=Screen.width||screenSize.y!=Screen.height){controls.Reset(match.Human);screenSize=new Vector2(Screen.width,Screen.height);}
            if(active)controls.Sample(match,UiScale,PauseRect,TogglePause);
            else controls.Reset(match.Human);
            if(paused||editing){accumulator=0;return;}
            accumulator+=Mathf.Min(Time.deltaTime,.1f);
            bool consume=true;
            while(accumulator>=MatchSimulation.StepSeconds)
            {
                match.Step(controls.Read(consume));consume=false;accumulator-=MatchSimulation.StepSeconds;
                if(match.Result!=null)break;
            }
            foreach(var c in match.Canals)if(!actors.Exists(v=>v.Actor==c))AddView(c);
            // Old destroyed Canals remain hidden; fresh Surge actors get their own views.
            foreach(var v in actors)v.Sync(Time.deltaTime);
            UpdateTerritory();UpdateCombatPresentation();
            if(match.Result!=null)
            {
                if(victoryAt<0){victoryAt=Time.unscaledTime;controls.Reset(match.Human);}
                if(Time.unscaledTime-victoryAt>=2)screen="results";
            }
        }
        void UpdateTerritory()
        {
            float f=(float)match.Front;
            blueFlow.SetFloat("_Active",match.Surge.ActiveTeam==1?1:0);redFlow.SetFloat("_Active",match.Surge.ActiveTeam==2?1:0);
            blueFlow.SetFloat("_Direction",1);redFlow.SetFloat("_Direction",-1);blueFlow.SetFloat("_MatchTime",(float)match.Now);redFlow.SetFloat("_MatchTime",(float)match.Now);
            blueTerritory.position=new Vector3((-28+f)/2,.015f,0);blueTerritory.localScale=new Vector3(Mathf.Max(.001f,f+28),.01f,24);
            redTerritory.position=new Vector3((28+f)/2,.015f,0);redTerritory.localScale=new Vector3(Mathf.Max(.001f,28-f),.01f,24);
            front.position=new Vector3(f,.04f,0);
            if(match.Surge.Active)
            {
                float wave=(Mathf.Sin((float)match.Now*3)+1)*.5f;
                front.localScale=new Vector3(.09f+wave*.07f,.035f,24);
            }
        }
        void UpdateCombatPresentation()
        {
            var removeShots=new List<Projectile>();foreach(var kv in shots)if(!match.Projectiles.Contains(kv.Key)){Destroy(kv.Value);removeShots.Add(kv.Key);}foreach(var p in removeShots)shots.Remove(p);
            foreach(var p in match.Projectiles)
            {
                GameObject go;if(!shots.TryGetValue(p,out go)){go=Shape(p.Persistent?"Riven persistent scythe":"Travelling projectile",PrimitiveType.Sphere,Vector3.zero,Vector3.one,projectileMaterials[p.Owner.Team]);shots[p]=go;}
                go.transform.position=MatchActorView.Ground(p.Position)+Vector3.up*.6f;
                go.transform.localScale=new Vector3((float)p.Width*1.2f,.25f,p.Persistent?.6f:.9f);
                go.transform.rotation=Quaternion.LookRotation(new Vector3((float)p.Direction.X,0,(float)p.Direction.Z).sqrMagnitude>.001f?new Vector3((float)p.Direction.X,0,(float)p.Direction.Z):Vector3.forward);
            }
            var removeEffects=new List<MatchEffect>();foreach(var kv in effects)if(!match.Effects.Contains(kv.Key)){Destroy(kv.Value.gameObject);removeEffects.Add(kv.Key);}foreach(var e in removeEffects)effects.Remove(e);
            foreach(var e in match.Effects)
            {
                LineRenderer line;if(!effects.TryGetValue(e,out line)){line=Ring(e.Kind,effectMaterial);line.startColor=line.endColor=TeamColor(e.Team);effects[e]=line;}
                Circle(line,e.Position,e.Kind=="hit"?.5:e.Kind=="trail"?.35:e.Radius);
            }
            var removeTelegraphs=new List<TimedAction>();foreach(var kv in telegraphs)if(!match.Actions.Contains(kv.Key)){Destroy(kv.Value.gameObject);removeTelegraphs.Add(kv.Key);}foreach(var a in removeTelegraphs)telegraphs.Remove(a);
            foreach(var a in match.Actions)if(a.Type==0)
            {
                LineRenderer line;if(!telegraphs.TryGetValue(a,out line)){line=Ring("Committed Panther Fist",effectMaterial);line.startColor=line.endColor=TeamColor(a.Owner.Team);telegraphs[a]=line;}
                Circle(line,a.Position,3);
            }
            preview.enabled=controls.Gesture.Active&&!paused&&!editing&&match.Active;
            if(preview.enabled)
            {
                var g=controls.Gesture;var p=match.Human;double range=match.Range(p,g.Slot);var kind=match.Targeting(p,g.Slot);
                preview.startColor=preview.endColor=g.Cancelled?Color.red:Color.white;
                if(kind==AimKind.Self)Circle(preview,p.Position,Mathf.Max(.8f,(float)range));
                else if(kind==AimKind.Ground)Circle(preview,p.Position+g.Offset,3);
                else
                {
                    preview.loop=false;preview.positionCount=2;preview.SetPosition(0,MatchActorView.Ground(p.Position)+Vector3.up*.08f);preview.SetPosition(1,MatchActorView.Ground(p.Position+g.Direction*range)+Vector3.up*.08f);
                }
            }
        }
        void TogglePause(){paused=!paused;controls.Reset(match.Human);accumulator=0;}
        void ClearWorld()
        {
            controls.Reset(match==null?null:match.Human);actors.Clear();shots.Clear();effects.Clear();telegraphs.Clear();
            if(world!=null){world.SetActive(false);Destroy(world);}foreach(var material in materials)Destroy(material);materials.Clear();match=null;
        }
        void Menu(){ClearWorld();screen="menu";paused=editing=false;}
        void OnApplicationFocus(bool focus){if(!focus&&screen=="match"&&match!=null&&match.Result==null){paused=true;controls.Reset(match.Human);}}
        void OnApplicationPause(bool value){if(value)OnApplicationFocus(false);}
        void OnDestroy(){ClearWorld();if(viewCamera!=null)Destroy(viewCamera.gameObject);}
    }
}
