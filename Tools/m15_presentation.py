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
def smooth(a,b,x):
 t=min(1,max(0,(x-a)/(b-a)));return t*t*(3-2*t)
def clearance(x,z):
 f=1
 for cx,cz,w,d in [(-22,-17,5,10),(22,-17,5,10),(-18,18,5,12),(18,18,5,12),(-7,-19.5,4,15),(7,-19.5,4,15),(0,19,8,14)]:
  dx=max(0,abs(x-cx)-w/2);dz=max(0,abs(z-cz)-d/2);f=min(f,smooth(1.5,3.5,math.hypot(dx,dz)))
 for cx,cz,r in [(-22,-22,2.4),(22,-22,2.4),(-18,24,2.4),(18,24,2.4),(-7,-27,2.4),(7,-27,2.4),(0,26,3.5)]:f=min(f,smooth(r+1.5,r+3.5,math.hypot(x-cx,z-cz)))
 return f
def terrain_height(x,z):
 if abs(x)<=34 and abs(z)<=32:
  edge=smooth(12.5,17,abs(z));mass=1.1+1.1*(.5+.5*math.sin(x*.22+math.sin(z*.24)))+.7*(.5+.5*math.cos(x*.37-z*.15))
  return -.025+edge*mass*(.55 if z>0 else .38)*clearance(x,z)
 rise=smooth(0,16,max(abs(x)-34,abs(z)-32));variation=.5+.25*math.sin(x*.19+z*.13)+.25*math.cos(z*.23-x*.11)
 return 2.05+rise*(8 if z>0 else 4)*(.65+variation*.6)
