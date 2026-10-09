"""Offline projection uses the same named constants as the runtime camera; not a Unity render."""
import math,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
code=(ROOT/'Assets/Crownfall/Environment/CameraFraming.cs').read_text()
def constant(name):
 match=re.search(r'\b'+name+r'\s*=\s*([0-9.]+)',code)
 if not match:raise AssertionError('Camera profile constant missing: '+name)
 return float(match[1])
PITCH,HALF_HEIGHT,HEIGHT,FOCUS=(constant(n) for n in ('Pitch','HalfHeight','Height','FocusNorth'))
PAD_X,PAD_Z=(constant(n) for n in ('HorizontalPadding','NorthSouthPadding'))
def clamp(v,extent,half):return 0 if extent>=half else max(-half+extent,min(half-extent,v))
def center(x,z,aspect=16/9):return clamp(x,HALF_HEIGHT*aspect,34+PAD_X),clamp(z+FOCUS,HALF_HEIGHT/math.sin(math.radians(PITCH)),32+PAD_Z)
def visible(b,x,z,aspect=16/9):
 s,c=math.sin(math.radians(PITCH)),math.cos(math.radians(PITCH));offset=HEIGHT/math.tan(math.radians(PITCH))
 return b[0]<x+HALF_HEIGHT*aspect and b[3]>x-HALF_HEIGHT*aspect and (b[2]-z)*s+b[1]*c<HALF_HEIGHT and (b[5]-z)*s+b[4]*c>-HALF_HEIGHT and (b[2]-z+offset)*c-(b[4]-HEIGHT)*s<150 and (b[5]-z+offset)*c-(b[1]-HEIGHT)*s>.1
def terrain_height(x,z):
 rise=min(1,max(0,max(abs(x)-34,abs(z)-32)/14));variation=.5+.25*math.sin(x*.19+z*.13)+.25*math.cos(z*.23-x*.11)
 return 2.05+rise*(7 if z>0 else 3)*(.65+variation*.6)
