using System;
using UnityEngine;

namespace Crownfall.Match
{
    public enum AudioCategory { Music,Sfx,Ui }
    [Serializable] public sealed class MatchAudioBank
    {
        public AudioClip menuMusic,matchMusic,resultMusic,cast,hit,death,objective,ui;
    }
    // No production clips are invented. Null banks/clips are a valid release state.
    public sealed class MatchAudioDirector : MonoBehaviour
    {
        public const int VoiceCap=12;
        public MatchAudioBank Bank=new MatchAudioBank();
        [Range(0,1)] public float Master=1,Music=.6f,Sfx=.8f,Ui=.8f;
        readonly AudioSource[] voices=new AudioSource[VoiceCap];
        readonly AudioCategory[] categories=new AudioCategory[VoiceCap];
        AudioSource music;
        bool unlocked,suspended;
        long cursor;
        string musicState;
        public void Initialize(GameObject camera)
        {
            if(camera.GetComponent<AudioListener>()==null)camera.AddComponent<AudioListener>();
            music=gameObject.AddComponent<AudioSource>();music.playOnAwake=false;music.loop=true;music.spatialBlend=0;
            for(int i=0;i<VoiceCap;i++){voices[i]=gameObject.AddComponent<AudioSource>();voices[i].playOnAwake=false;voices[i].spatialBlend=0;}
        }
        public void Unlock(){unlocked=true;musicState=null;}
        float Volume(AudioCategory c)=>Mathf.Clamp01(Master)*Mathf.Clamp01(c==AudioCategory.Music?Music:c==AudioCategory.Ui?Ui:Sfx);
        public void Play(AudioClip clip,AudioCategory category)
        {
            if(!unlocked||suspended||clip==null)return;
            for(int i=0;i<VoiceCap;i++)if(!voices[i].isPlaying)
            {categories[i]=category;voices[i].clip=clip;voices[i].volume=Volume(category);voices[i].Play();return;}
        }
        public void UiEvent(){Unlock();Play(Bank.ui,AudioCategory.Ui);}
        public void Sync(MatchSimulation match,string screen,bool paused)
        {
            if(suspended!=paused){suspended=paused;if(paused)Stop();else musicState=null;}
            if(unlocked&&!suspended&&screen!=musicState)
            {
                musicState=screen;music.Stop();music.clip=screen=="match"?Bank.matchMusic:screen=="results"?Bank.resultMusic:Bank.menuMusic;
                if(music.clip!=null)music.Play();
            }
            music.volume=Volume(AudioCategory.Music);
            for(int i=0;i<VoiceCap;i++)voices[i].volume=Volume(categories[i]);
            if(match==null)return;
            PresentationEvent e;
            while(match.Presentation.Read(ref cursor,out e))
            {
                if(match.Now-e.Time>.2)continue;
                var clip=e.Phase==PresentationPhase.Cast?Bank.cast:e.Phase==PresentationPhase.Hit?Bank.hit:e.Phase==PresentationPhase.Death?Bank.death:e.Phase==PresentationPhase.Objective?Bank.objective:null;
                Play(clip,AudioCategory.Sfx);
            }
        }
        void Stop(){if(music!=null)music.Stop();foreach(var source in voices)if(source!=null){source.Stop();source.clip=null;}}
        public void ResetMatch(){Stop();cursor=0;musicState=null;}
        void OnApplicationFocus(bool focus){if(!focus){suspended=true;Stop();}}
        void OnApplicationPause(bool value){if(value)OnApplicationFocus(false);}
        void OnDisable(){Stop();}
    }
}
